"""
AssistiveAI Inference Service

Connects to an ESP32-S3 Sense camera (USB serial **or** Wi-Fi),
runs YOLOv8 object detection + MiDaS depth estimation, and serves
an annotated MJPEG stream with distance-aware voice feedback.

Camera modes (set CAMERA_MODE in .env):
    serial  — ESP32 plugged into PC via USB  (default for development)
    wifi    — ESP32 streaming over Wi-Fi     (for production / wearable)

Detection features:
    • Direction (left / center / right) based on bbox position in frame
    • Distance  (metres) via MiDaS monocular depth
    • Steps     (approximate walking steps to object)
    • De-duplication — each tracked object is announced at most 3 times

Endpoints:
    GET  /              — service info
    GET  /video_feed    — annotated MJPEG stream (browser)
    GET  /api/frame     — single annotated JPEG  (mobile polling)
    GET  /api/status    — JSON connection & model status
    GET  /api/detections— latest tracked objects as JSON
    POST /api/config    — update configuration at runtime
"""

from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import cv2
import numpy as np
import struct
import serial as pyserial
import threading
import time
import torch
import asyncio
import tempfile
import queue
import os

import requests as http_requests
from dotenv import load_dotenv
from ultralytics import YOLO

load_dotenv()

app = Flask(__name__)
CORS(app)

# ========================== Configuration =============================

# Camera source: "serial" (USB) or "wifi" (HTTP stream)
CAMERA_MODE = os.environ.get("CAMERA_MODE", "serial").lower()

# Serial mode settings
SERIAL_PORT = os.environ.get("SERIAL_PORT", "COM3")
SERIAL_BAUD = int(os.environ.get("SERIAL_BAUD", "921600"))  # must match firmware SERIAL_BAUD

# Wi-Fi mode settings
ESP32_STREAM_URL = os.environ.get(
    "ESP32_STREAM_URL", "http://192.168.1.100:81/stream"
)

# AI models
WEIGHTS_PATH = os.environ.get(
    "WEIGHTS_PATH",
    os.path.join(os.path.dirname(__file__), "weights", "best.pt"),
)
USE_GPU = torch.cuda.is_available()
IMG_SIZE = 320
CONF_THRES = 0.7
DETECT_EVERY = 20  # Run detection every 20 frames (~1.5x per second) — balanced
DISTANCE_SCALAR = 400
VOICE_FEEDBACK_INTERVAL = 7
TTS_ENABLED = os.environ.get("TTS_ENABLED", "true").lower() == "true"

# Direction & steps
AVG_STEP_LENGTH = 0.75          # metres per step for an average adult
MAX_ANNOUNCE_COUNT = 3          # stop repeating after this many TTS announcements


# ========================== Wi-Fi Camera ==============================

class WiFiCamera:
    """Reads MJPEG frames from ESP32's HTTP stream over Wi-Fi."""

    def __init__(self, stream_url):
        self.stream_url = stream_url
        self.frame = None
        self.stopped = False
        self.connected = False
        self.fps = 0.0
        self._lock = threading.Lock()
        self._thread = threading.Thread(target=self._update, daemon=True)

    def start(self):
        self._thread.start()
        return self

    def _update(self):
        while not self.stopped:
            try:
                resp = http_requests.get(
                    self.stream_url, stream=True, timeout=10
                )
                self.connected = True
                print(f"[WIFI CAM] Connected to {self.stream_url}")

                buf = b""
                frame_count = 0
                t0 = time.time()

                for chunk in resp.iter_content(chunk_size=4096):
                    if self.stopped:
                        break
                    buf += chunk

                    # Locate JPEG SOI (0xFFD8) and EOI (0xFFD9)
                    a = buf.find(b"\xff\xd8")
                    b = buf.find(b"\xff\xd9")

                    if a != -1 and b != -1 and b > a:
                        jpg = buf[a : b + 2]
                        buf = buf[b + 2 :]

                        frame = cv2.imdecode(
                            np.frombuffer(jpg, dtype=np.uint8),
                            cv2.IMREAD_COLOR,
                        )

                        if frame is not None:
                            with self._lock:
                                self.frame = frame

                            frame_count += 1
                            elapsed = time.time() - t0
                            if elapsed >= 2.0:
                                self.fps = frame_count / elapsed
                                frame_count = 0
                                t0 = time.time()

            except Exception as e:
                self.connected = False
                self.fps = 0.0
                print(f"[WIFI CAM] Error: {e}")
                if not self.stopped:
                    print("[WIFI CAM] Reconnecting in 2 s…")
                    time.sleep(2)

    def read(self):
        with self._lock:
            return self.frame.copy() if self.frame is not None else None

    def is_connected(self):
        return self.connected

    def stop(self):
        self.stopped = True
        self._thread.join(timeout=5)


# ========================== Serial Camera =============================

class SerialCamera:
    """Reads JPEG frames from ESP32 over USB serial (original VIhelp protocol).

    Frame format on the wire:
        0xFF 0xD8  (JPEG SOI marker)
        4 bytes    (frame length, little-endian uint32)
        N bytes    (JPEG payload)
    """

    def __init__(self, port, baud):
        self.ser = pyserial.Serial(port, baud, timeout=1)
        print(f"[SERIAL CAM] Opened {port} @ {baud}")
        self.frame = None
        self.stopped = False
        self.connected = False
        self.fps = 0.0
        self._lock = threading.Lock()
        self._thread = threading.Thread(target=self._update, daemon=True)

    def start(self):
        self._thread.start()
        return self

    def _read_exact(self, size):
        data = b""
        while len(data) < size and not self.stopped:
            packet = self.ser.read(size - len(data))
            if not packet:
                return None
            data += packet
        return data

    def _update(self):
        frame_count = 0
        t0 = time.time()

        while not self.stopped:
            try:
                # Scan for JPEG SOI marker
                if self.ser.read(1) != b"\xff":
                    continue
                if self.ser.read(1) != b"\xd8":
                    continue

                length_bytes = self._read_exact(4)
                if not length_bytes:
                    continue

                frame_len = struct.unpack("I", length_bytes)[0]
                if frame_len <= 0 or frame_len > 200000:
                    continue

                jpeg = self._read_exact(frame_len)
                if not jpeg:
                    continue

                img_array = np.frombuffer(jpeg, dtype=np.uint8)
                frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

                if frame is not None:
                    with self._lock:
                        self.frame = frame
                    self.connected = True

                    frame_count += 1
                    elapsed = time.time() - t0
                    if elapsed >= 2.0:
                        self.fps = frame_count / elapsed
                        frame_count = 0
                        t0 = time.time()

            except Exception as e:
                self.connected = False
                print(f"[SERIAL CAM] Error: {e}")
                time.sleep(0.5)

    def read(self):
        with self._lock:
            return self.frame.copy() if self.frame is not None else None

    def is_connected(self):
        return self.connected

    def stop(self):
        self.stopped = True
        self._thread.join(timeout=5)
        self.ser.close()


# ========================== Dummy Camera (offline placeholder) ========

class _DummyCamera:
    """Returned when the real camera can't be opened.  Keeps the Flask
    server alive so the mobile app can still reach /api/status."""

    def __init__(self, label=""):
        self._label = label
        self.fps = 0.0

    def read(self):
        return None

    def is_connected(self):
        return False

    def stop(self):
        pass


# ========================== Helpers ===================================

def color_for_cls(cls_id):
    return (int(37 * cls_id) % 255, int(17 * cls_id) % 255, int(29 * cls_id) % 255)


def iou_xyxy(a, b):
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    denom = (
        (ax2 - ax1) * (ay2 - ay1)
        + (bx2 - bx1) * (by2 - by1)
        - inter
        + 1e-9
    )
    return inter / denom


def get_direction(cx, frame_width):
    """Return 'left', 'center', or 'right' based on the object's
    horizontal position in the frame (split into thirds)."""
    third = frame_width / 3.0
    if cx < third:
        return "left"
    elif cx > third * 2:
        return "right"
    else:
        return "center"


def distance_to_steps(distance_m):
    """Convert a distance in metres to approximate adult walking steps.
    Average step ≈ 0.75 m."""
    if distance_m <= 0:
        return 0
    return max(1, round(distance_m / AVG_STEP_LENGTH))


# ========================== Object Tracking ===========================

class Track:
    _next_id = 1

    def __init__(self, xyxy, cls, conf, frame_width):
        self.id = Track._next_id
        Track._next_id += 1
        self.cls = int(cls)
        self.color = color_for_cls(self.cls)
        self.label = str(self.cls)
        self.conf_ema = float(conf)
        self.xyxy = list(xyxy)
        self.ttl = 12
        self.distance = 0.0
        self.direction = get_direction((xyxy[0] + xyxy[2]) / 2, frame_width)
        self.steps = 0
        self.announce_count = 0     # how many times TTS has spoken this track

    def smooth_update(self, new_xyxy, new_conf, frame_width):
        a = 0.6
        self.xyxy = [a * o + (1 - a) * n for o, n in zip(self.xyxy, new_xyxy)]
        self.conf_ema = a * self.conf_ema + (1 - a) * new_conf
        self.ttl = 12
        # Refresh direction from smoothed bbox
        cx = (self.xyxy[0] + self.xyxy[2]) / 2
        self.direction = get_direction(cx, frame_width)

    def update_distance(self, new_distance):
        if self.distance == 0:
            self.distance = new_distance
        else:
            self.distance = 0.7 * self.distance + 0.3 * new_distance
        self.steps = distance_to_steps(self.distance)

    def step(self):
        self.ttl -= 1
        self.conf_ema *= 0.995

    def can_announce(self):
        """Return True if this track has not yet been announced MAX times."""
        return self.announce_count < MAX_ANNOUNCE_COUNT

    def mark_announced(self):
        self.announce_count += 1

    def to_dict(self):
        return {
            "id": self.id,
            "label": self.label,
            "confidence": float(round(self.conf_ema, 3)),
            "bbox": [float(round(v, 1)) for v in self.xyxy],
            "distance": float(round(self.distance, 2)),
            "direction": self.direction,
            "steps": int(self.steps),
            "announced": int(self.announce_count),
        }


class TrackManager:
    def __init__(self, names, frame_width=320):
        self.tracks = []
        self.names = names
        self.frame_width = frame_width

    def update(self, detections, depth_map=None):
        used = set()

        for tr in self.tracks:
            best_iou, best_j = 0, -1
            for j, (x1, y1, x2, y2, conf, cls) in enumerate(detections):
                if j in used or cls != tr.cls:
                    continue
                score = iou_xyxy(tr.xyxy, [x1, y1, x2, y2])
                if score > best_iou:
                    best_iou, best_j = score, j

            if best_j >= 0 and best_iou > 0.3:
                x1, y1, x2, y2, conf, cls = detections[best_j]
                tr.smooth_update([x1, y1, x2, y2], conf, self.frame_width)
                used.add(best_j)

                if depth_map is not None:
                    cx = int((x1 + x2) / 2)
                    cy = int((y1 + y2) / 2)
                    if 0 <= cy < depth_map.shape[0] and 0 <= cx < depth_map.shape[1]:
                        d = depth_map[cy, cx]
                        if d > 0:
                            tr.update_distance(DISTANCE_SCALAR / d)

        for j, (x1, y1, x2, y2, conf, cls) in enumerate(detections):
            if j in used or conf < 0.55:
                continue
            tr = Track([x1, y1, x2, y2], cls, conf, self.frame_width)
            tr.label = self.names.get(cls, str(cls))

            # Compute initial distance + steps if depth map available
            if depth_map is not None:
                cx = int((x1 + x2) / 2)
                cy = int((y1 + y2) / 2)
                if 0 <= cy < depth_map.shape[0] and 0 <= cx < depth_map.shape[1]:
                    d = depth_map[cy, cx]
                    if d > 0:
                        tr.update_distance(DISTANCE_SCALAR / d)

            self.tracks.append(tr)

    def step(self):
        self.tracks = [
            t
            for t in self.tracks
            if (t.step(), t.ttl > 0 and t.conf_ema > 0.25)[1]
        ]

    def draw(self, frame):
        """Draw bounding boxes, labels, direction, distance & steps on frame."""
        dir_symbols = {"left": "<", "center": "^", "right": ">"}

        for tr in self.tracks:
            x1, y1, x2, y2 = map(int, tr.xyxy)
            cv2.rectangle(frame, (x1, y1), (x2, y2), tr.color, 2)

            # Top label: "person:0.92"
            label = f"{tr.label}:{tr.conf_ema:.2f}"
            cv2.putText(
                frame, label, (x1, y1 - 5),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1,
            )

            # Bottom-left: direction arrow + distance
            if tr.distance > 0:
                sym = dir_symbols.get(tr.direction, "^")
                dist_text = f"{sym} {tr.distance:.1f}m"
                cv2.putText(
                    frame, dist_text, (x1, y2 + 14),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1,
                )

                # Bottom-left (second line): steps
                step_text = f"~{tr.steps} step{'s' if tr.steps != 1 else ''}"
                cv2.putText(
                    frame, step_text, (x1, y2 + 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 200, 255), 1,
                )
            else:
                # Direction only (no distance yet)
                cv2.putText(
                    frame, tr.direction, (x1, y2 + 14),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1,
                )

    def get_detections(self):
        return [t.to_dict() for t in self.tracks]

    def get_announceable_track(self):
        """Return the highest-confidence track that hasn't been announced
        MAX_ANNOUNCE_COUNT times yet, or None."""
        candidates = [t for t in self.tracks if t.can_announce()]
        if not candidates:
            return None
        return max(candidates, key=lambda t: t.conf_ema)


# ========================== Voice Feedback ============================

tts_queue = queue.Queue()


def _play_audio(filepath):
    """Play an MP3 file using platform-native APIs (no pip packages)."""
    import platform

    if platform.system() == "Windows":
        import ctypes

        winmm = ctypes.windll.winmm
        abspath = os.path.abspath(filepath).replace("\\", "\\\\")
        winmm.mciSendStringW(f'open "{abspath}" type mpegvideo alias tts', None, 0, 0)
        winmm.mciSendStringW("play tts wait", None, 0, 0)
        winmm.mciSendStringW("close tts", None, 0, 0)
    else:
        import subprocess

        for player in ("mpv", "ffplay", "aplay"):
            try:
                subprocess.run(
                    [player, "--no-video", filepath]
                    if player == "mpv"
                    else [player, "-nodisp", "-autoexit", filepath]
                    if player == "ffplay"
                    else [player, filepath],
                    capture_output=True,
                )
                return
            except FileNotFoundError:
                continue
        print("[TTS] No audio player found (install mpv or ffplay)")


def tts_worker():
    try:
        import edge_tts
    except ImportError:
        print("[TTS] edge_tts not installed — TTS disabled")
        return

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    while True:
        text = tts_queue.get()
        if text is None:
            break
        try:
            filename = tempfile.mktemp(suffix=".mp3")

            async def _synth():
                comm = edge_tts.Communicate(text, voice="en-US-AriaNeural")
                await comm.save(filename)

            loop.run_until_complete(_synth())
            _play_audio(filename)
        except Exception as e:
            print(f"[TTS ERROR] {e}")


if TTS_ENABLED:
    _tts_thread = threading.Thread(target=tts_worker, daemon=True)
    _tts_thread.start()


def speak(text):
    if not TTS_ENABLED:
        return
    if not tts_queue.empty():
        return
    tts_queue.put(text)


# ========================== Global State ==============================

cam = None
yolo_model = None
midas_model = None
midas_transform = None
track_mgr = None

# Thread-safe shared state — use a dict so mutations are always visible
# across threads (avoids stale global-variable references).
_shared = {
    "detections": [],
    "frame_id": 0,
    "jpeg": None,
}
_lock = threading.Lock()

last_voice = time.time()


def init_models():
    global yolo_model, midas_model, midas_transform

    device = "cuda" if USE_GPU else "cpu"
    print(f"[AI] Device: {device}")

    print(f"[AI] Loading YOLO from {WEIGHTS_PATH}")
    yolo_model = YOLO(WEIGHTS_PATH).to(device)

    print("[AI] Loading MiDaS depth model…")
    midas_model = torch.hub.load(
        "intel-isl/MiDaS", "MiDaS_small", trust_repo=True
    ).to(device)
    midas_model.eval()

    midas_transform = torch.hub.load(
        "intel-isl/MiDaS", "transforms", trust_repo=True
    ).small_transform

    print("[AI] Models loaded OK")


def init_camera():
    global cam
    if CAMERA_MODE == "serial":
        print(f"[CAM] Opening serial port {SERIAL_PORT} @ {SERIAL_BAUD}")
        try:
            cam = SerialCamera(SERIAL_PORT, SERIAL_BAUD).start()
        except Exception as e:
            print(f"[CAM] ⚠ Could not open {SERIAL_PORT}: {e}")
            print("[CAM]   Plug in the ESP32 and restart, or check SERIAL_PORT in .env")
            cam = _DummyCamera(f"serial:{SERIAL_PORT}")
    else:
        print(f"[CAM] Connecting to Wi-Fi stream at {ESP32_STREAM_URL}")
        cam = WiFiCamera(ESP32_STREAM_URL).start()
    time.sleep(2)


# ========================== Frame Pipeline ============================

def generate_frames():
    global cam, yolo_model, midas_model, midas_transform, track_mgr
    global last_voice

    if cam is None:
        init_camera()
    if yolo_model is None:
        init_models()
    if track_mgr is None:
        track_mgr = TrackManager(yolo_model.names, frame_width=320)

    local_frame_id = 0

    while True:
        try:
            frame = cam.read()
            if frame is None:
                time.sleep(0.01)
                continue

            # Update frame_width in tracker from actual frame dimensions
            h, w = frame.shape[:2]
            track_mgr.frame_width = w

            depth_map = None

            if local_frame_id % DETECT_EVERY == 0:
                results = yolo_model.predict(
                    frame, imgsz=IMG_SIZE, conf=CONF_THRES, verbose=False
                )[0]

                dets = []
                if results.boxes is not None:
                    for b in results.boxes:
                        x1, y1, x2, y2 = b.xyxy.cpu().numpy().flatten()
                        dets.append(
                            (x1, y1, x2, y2, float(b.conf), int(b.cls))
                        )

                if dets:
                    img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    inp = midas_transform(img).to(yolo_model.device)

                    with torch.no_grad():
                        pred = midas_model(inp)
                        pred = torch.nn.functional.interpolate(
                            pred.unsqueeze(1),
                            size=frame.shape[:2],
                            mode="bicubic",
                            align_corners=False,
                        ).squeeze()

                    depth_map = pred.detach().cpu().numpy()

                track_mgr.update(dets, depth_map)

            track_mgr.step()
            track_mgr.draw(frame)

            # Snapshot detections + JPEG into the shared dict
            det_snapshot = track_mgr.get_detections()

            ret, buffer = cv2.imencode(".jpg", frame)
            jpg_bytes = buffer.tobytes() if ret else None

            with _lock:
                _shared["detections"] = det_snapshot
                _shared["frame_id"] = local_frame_id
                if jpg_bytes:
                    _shared["jpeg"] = jpg_bytes

            # Log detection count periodically
            if local_frame_id % 100 == 0:
                print(f"[INF] frame={local_frame_id}  tracks={len(track_mgr.tracks)}  dets={len(det_snapshot)}")

            # ── Voice feedback (with de-duplication) ─────────────────
            if time.time() - last_voice >= VOICE_FEEDBACK_INTERVAL:
                best = track_mgr.get_announceable_track()
                if best is not None:
                    parts = [best.label]
                    if best.distance > 0:
                        parts.append(f"{best.distance:.1f} meters")
                        parts.append(f"on your {best.direction}")
                        parts.append(f"about {best.steps} step{'s' if best.steps != 1 else ''} away")
                    else:
                        parts.append(f"on your {best.direction}")
                    speak(", ".join(parts))
                    best.mark_announced()
                else:
                    if not track_mgr.tracks:
                        speak("Path clear")
                last_voice = time.time()

            local_frame_id += 1

            if jpg_bytes:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n"
                    + jpg_bytes
                    + b"\r\n"
                )

        except Exception as e:
            print(f"[INF ERROR] {e}")
            time.sleep(0.1)


# ========================== Background Inference ======================
# Keeps the pipeline running so /api/frame always has a fresh snapshot,
# even when nobody is consuming the MJPEG /video_feed stream.

_inference_thread = None


def _background_inference():
    """Consume generate_frames() in the background."""
    for _ in generate_frames():
        pass  # side-effects (tracking, jpeg, detections) happen in the generator


def ensure_inference_running():
    global _inference_thread
    if _inference_thread is None or not _inference_thread.is_alive():
        _inference_thread = threading.Thread(
            target=_background_inference, daemon=True
        )
        _inference_thread.start()
        print("[AI] Background inference thread started")


# ========================== Routes ====================================

@app.route("/")
def index():
    return jsonify(
        {
            "service": "AssistiveAI Inference Service",
            "endpoints": {
                "/video_feed": "Annotated MJPEG stream (browser)",
                "/api/frame": "Single annotated JPEG (mobile polling)",
                "/api/status": "Service status (JSON)",
                "/api/detections": "Latest detection results (JSON)",
                "/api/config": "Update configuration (POST)",
            },
        }
    )


@app.route("/video_feed")
def video_feed():
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame",
    )


@app.route("/api/frame")
def api_frame():
    """Return a single annotated JPEG snapshot (for polling from mobile)."""
    ensure_inference_running()
    with _lock:
        jpg = _shared["jpeg"]
    if jpg is None:
        return Response(status=204)
    return Response(jpg, mimetype="image/jpeg",
                    headers={"Cache-Control": "no-store",
                             "Access-Control-Allow-Origin": "*"})


@app.route("/api/status")
def api_status():
    source = (
        f"serial:{SERIAL_PORT}" if CAMERA_MODE == "serial"
        else ESP32_STREAM_URL
    )
    with _lock:
        fid = _shared["frame_id"]
    return jsonify(
        {
            "camera_connected": cam.is_connected() if cam else False,
            "camera_fps": round(cam.fps, 1) if cam else 0,
            "camera_mode": CAMERA_MODE,
            "camera_source": source,
            "models_loaded": yolo_model is not None,
            "gpu": USE_GPU,
            "frame_count": fid,
        }
    )


@app.route("/api/detections")
def api_detections():
    with _lock:
        dets = _shared["detections"]
        fid = _shared["frame_id"]
    return jsonify(
        {
            "detections": dets,
            "frame_id": fid,
            "timestamp": time.time(),
        }
    )


@app.route("/api/config", methods=["POST"])
def api_config():
    global ESP32_STREAM_URL, cam
    data = request.get_json()

    if "esp32_url" in data:
        new_url = data["esp32_url"]
        if cam:
            cam.stop()
        ESP32_STREAM_URL = new_url
        cam = WiFiCamera(ESP32_STREAM_URL).start()
        return jsonify({"status": "ok", "esp32_url": ESP32_STREAM_URL})

    return jsonify({"error": "No valid config provided"}), 400


# ========================== Main ======================================

if __name__ == "__main__":
    port = int(os.environ.get("AI_SERVICE_PORT", "5000"))
    try:
        # Initialise camera + models BEFORE the Flask server starts
        # so /api/status reports correctly from the very first request.
        init_camera()
        init_models()
        ensure_inference_running()

        print(f"[SERVER] Starting on 0.0.0.0:{port}")
        app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
    finally:
        if cam:
            cam.stop()
