import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Modal,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import wifiCamera from '../../services/wifi/WifiCameraService';

const C = {
  bg:       '#0A0A0F',
  card:     '#12121C',
  border:   '#1E1E2E',
  primary:  '#00AAFF',
  accent:   '#7C4DFF',
  text:     '#E8E8F0',
  textSub:  '#6B7080',
  success:  '#00D68F',
  error:    '#FF3D57',
  warning:  '#FFAA00',
};

const FRAME_INTERVAL = 333;  // ~3 FPS polling — stable, no flicker (was 250, then 150)

// ── Flicker-free frame viewer ───────────────────────────────────────
function FrameViewer({ baseUrl }) {
  const [displayUri, setDisplayUri] = useState(null);
  const timerRef  = useRef(null);
  const mounted   = useRef(true);

  const makeUri = useCallback(
    () => `${baseUrl}/api/frame?t=${Date.now()}`,
    [baseUrl],
  );

  useEffect(() => {
    mounted.current = true;
    setDisplayUri(makeUri());
    return () => {
      mounted.current = false;
      clearTimeout(timerRef.current);
    };
  }, [baseUrl, makeUri]);

  const scheduleNext = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!mounted.current) return;
      const uri = makeUri();
      Image.prefetch(uri)
        .then(() => {
          if (mounted.current) setDisplayUri(uri);
          if (mounted.current) scheduleNext();
        })
        .catch((err) => {
          console.log('[Frame] Prefetch error:', err.message);
          if (mounted.current) scheduleNext();
        });
    }, FRAME_INTERVAL);
  }, [makeUri]);

  return (
    <View style={s.frameBox}>
      {displayUri && (
        <Image
          source={{ uri: displayUri }}
          style={s.frame}
          resizeMode="contain"
          fadeDuration={0}
          onLoad={scheduleNext}
          onError={scheduleNext}
        />
      )}
    </View>
  );
}

// ── Direction helpers ────────────────────────────────────────────────
const DIR_ICON = { left: 'arrow-back', right: 'arrow-forward', center: 'arrow-up' };
const DIR_COLOR = { left: '#FF6B6B', right: '#4ECDC4', center: C.primary };

// ═════════════════════════════════════════════════════════════════════
export default function CameraScreen() {
  const [serviceUrl, setServiceUrl] = useState(wifiCamera.baseUrl);
  const [connected, setConnected]   = useState(false);
  const [cameraMode, setCameraMode] = useState(null);
  const [detections, setDetections] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [tempUrl, setTempUrl]       = useState(serviceUrl);
  const [checking, setChecking]     = useState(true);
  const [cameraFps, setCameraFps]   = useState(0);
  const [aiServiceOnline, setAiServiceOnline] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('ready');
  const [highlightedDetId, setHighlightedDetId] = useState(null);  // Keep detected object visible
  const pollRef = useRef(null);
  const currentlySpeakingRef = useRef(false);
  const lastAnnouncedConfRef = useRef(0);  // Track last announced confidence

  // ── Voice feedback: Instant, highest confidence, non-overlapping ─────
  useEffect(() => {
    if (detections.length === 0) {
      setHighlightedDetId(null);
      lastAnnouncedConfRef.current = 0;  // Reset for next detection
      return;
    }

    // Find HIGHEST CONFIDENCE detection
    const bestDet = detections.reduce((best, curr) =>
      (curr.confidence > best.confidence) ? curr : best
    );

    if (!bestDet) return;

    const detId = bestDet.id ?? `${bestDet.label}_${bestDet.bbox?.[0] || 0}`;
    setHighlightedDetId(detId);

    // Debug: log why voice might not trigger
    console.log('[VOICE DEBUG]', {
      speaking: currentlySpeakingRef.current,
      confidence: bestDet.confidence,
      lastAnnounced: lastAnnouncedConfRef.current,
      shouldSpeak: !currentlySpeakingRef.current && bestDet.confidence > lastAnnouncedConfRef.current
    });

    // Only speak if: not speaking AND confidence is higher than last announced
    if (currentlySpeakingRef.current || bestDet.confidence <= lastAnnouncedConfRef.current) {
      console.log('[VOICE] Skipped - speaking or lower confidence');
      return;
    }

    // Build announcement
    const parts = [bestDet.label];
    if (bestDet.distance > 0) {
      parts.push(`${bestDet.distance.toFixed(1)} meters`);
      parts.push(`on your ${bestDet.direction || 'center'}`);
    } else if (bestDet.direction) {
      parts.push(`on your ${bestDet.direction}`);
    }

    const text = parts.join(', ');
    console.log('[VOICE] New detection:', text, `(${Math.round(bestDet.confidence * 100)}%)`);
    setVoiceStatus(`Speaking: ${text.slice(0, 30)}...`);
    lastAnnouncedConfRef.current = bestDet.confidence;

    try {
      Speech.stop?.().catch(() => {});
      currentlySpeakingRef.current = true;

      const speakPromise = Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.65,
        onStart: () => console.log('[VOICE] Started speaking'),
        onDone: () => {
          console.log('[VOICE] Finished speaking');
          currentlySpeakingRef.current = false;
          setVoiceStatus('ready');
          setHighlightedDetId(null);  // Clear highlight after speech done
        },
        onError: (err) => {
          console.log('[VOICE ERROR]', err);
          currentlySpeakingRef.current = false;
          setHighlightedDetId(null);
        },
      });

      speakPromise?.catch((err) => {
        console.log('[VOICE CATCH]', err);
        currentlySpeakingRef.current = false;
        setHighlightedDetId(null);
      });
    } catch (err) {
      console.log('[VOICE EXCEPTION]', err);
      currentlySpeakingRef.current = false;
      setHighlightedDetId(null);
    }
  }, [detections]);

  // ── Poll status + detections ──────────────────────────────────────
  const poll = useCallback(async () => {
    // Status
    try {
      const st = await wifiCamera.getStatus();
      setConnected(st.camera_connected);
      setCameraFps(st.camera_fps || 0);
      setCameraMode(st.camera_mode || null);
      setAiServiceOnline(true);
    } catch {
      setConnected(false);
      setCameraFps(0);
      setAiServiceOnline(false);
    } finally {
      setChecking(false);
    }

    // Detections
    try {
      const dt = await wifiCamera.getDetections();
      if (dt && Array.isArray(dt.detections)) {
        setDetections(dt.detections);
      }
    } catch {
      // keep previous
    }
  }, []);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 1500);
    return () => clearInterval(pollRef.current);
  }, [poll]);

  const saveSettings = () => {
    wifiCamera.setBaseUrl(tempUrl);
    setServiceUrl(tempUrl);
    setShowSettings(false);
    setChecking(true);
    poll();
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Live Camera</Text>
          <View style={s.statusRow}>
            <View style={[s.dot, { backgroundColor: connected ? C.success : C.error }]} />
            <Text style={[s.statusText, { color: connected ? C.success : C.textSub }]}>
              {checking
                ? 'Checking…'
                : connected
                ? `${cameraMode === 'serial' ? 'USB' : 'Wi-Fi'} · ${cameraFps} FPS`
                : aiServiceOnline
                ? `${cameraMode === 'serial' ? 'Serial' : 'Wi-Fi'} — Waiting`
                : 'AI Service offline'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={s.settingsBtn}
          onPress={() => { setTempUrl(serviceUrl); setShowSettings(true); }}
        >
          <Ionicons name="settings-outline" size={22} color={C.textSub} />
        </TouchableOpacity>
      </View>

      {/* ── Debug: Voice Status (hidden for now) ── */}
      {false && (
        <View style={s.debugBar}>
          <Text style={s.debugText}>🔊 {voiceStatus}</Text>
          <Text style={s.debugText}>📊 Detections: {detections.length} | Connected: {connected ? 'YES' : 'NO'}</Text>
        </View>
      )}

      {/* ── Video Feed ── */}
      <View style={s.videoContainer}>
        {connected ? (
          <FrameViewer baseUrl={wifiCamera.baseUrl} />
        ) : (
          <View style={s.placeholder}>
            {checking ? (
              <ActivityIndicator color={C.primary} size="large" />
            ) : (
              <>
                <Ionicons
                  name={aiServiceOnline ? 'videocam-off-outline' : 'cloud-offline-outline'}
                  size={48} color={C.textSub}
                />
                <Text style={s.placeholderText}>
                  {aiServiceOnline ? 'Waiting for camera' : 'AI Service offline'}
                </Text>
                <Text style={s.placeholderSub}>
                  {aiServiceOnline
                    ? cameraMode === 'serial'
                      ? 'Plug ESP32 into PC via USB'
                      : 'Check ESP32 Wi-Fi connection'
                    : 'Start the AI service: python app.py'}
                </Text>
                <TouchableOpacity style={s.retryBtn} onPress={() => { setChecking(true); poll(); }}>
                  <Text style={s.retryText}>Retry</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>

      {/* ── Detections List ── */}
      <View style={s.detPanel}>
        <Text style={s.panelTitle}>
          Detections{detections.length > 0 ? ` (${detections.length})` : ''}
        </Text>

        <ScrollView style={s.detScroll} showsVerticalScrollIndicator={false}>
          {detections.length > 0 ? (
            detections.slice(0, 10).map((d, i) => {
              const isHighlighted = highlightedDetId === (d.id ?? `${d.label}_${d.bbox?.[0] || 0}`);
              const color = DIR_COLOR[d.direction] || C.primary;
              return (
                <View key={d.id ?? i} style={[s.detItem, isHighlighted && { backgroundColor: C.primary + '15', borderLeftWidth: 4, borderLeftColor: C.primary }]}>
                  {/* Number */}
                  <View style={s.detNum}>
                    <Text style={s.detNumText}>{i + 1}</Text>
                  </View>

                  {/* Main info */}
                  <View style={s.detInfo}>
                    {/* Line 1:  "bottle  0.8m  center" */}
                    <View style={s.detLine1}>
                      <Text style={s.detLabel}>{d.label}</Text>
                      {d.distance > 0 && (
                        <View style={s.distBadge}>
                          <Text style={s.distText}>{d.distance.toFixed(1)}m</Text>
                        </View>
                      )}
                      {d.direction && (
                        <View style={[s.dirBadge, { backgroundColor: color + '20' }]}>
                          <Ionicons
                            name={DIR_ICON[d.direction] || 'arrow-up'}
                            size={11} color={color}
                          />
                          <Text style={[s.dirText, { color }]}>
                            {d.direction}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Line 2:  "~2 steps away  ·  79%" */}
                    <Text style={s.detLine2}>
                      {d.steps > 0
                        ? `~${d.steps} step${d.steps !== 1 ? 's' : ''} away`
                        : 'calculating…'}
                      {'  ·  '}
                      {Math.round(d.confidence * 100)}% conf
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={s.emptyBox}>
              <Ionicons name="scan-outline" size={32} color={C.textSub} />
              <Text style={s.emptyText}>No objects detected</Text>
              <Text style={s.emptySub}>
                Point the camera at objects to see detections
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* ── Settings Modal ── */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>AI Service Settings</Text>
            <Text style={s.modalLabel}>Service URL</Text>
            <TextInput
              style={s.input}
              value={tempUrl}
              onChangeText={setTempUrl}
              placeholder="http://192.168.1.100:5000"
              placeholderTextColor={C.textSub}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={s.hint}>
              The IP of the machine running the Python AI service.
            </Text>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowSettings(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={saveSettings}>
                <Text style={s.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  title: { color: C.text, fontSize: 20, fontWeight: '800' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.card, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },

  // Debug
  debugBar: {
    backgroundColor: C.card, paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  debugText: { color: C.primary, fontSize: 11, fontWeight: '600', marginTop: 2 },

  // Video
  videoContainer: {
    marginHorizontal: 16, borderRadius: 16, overflow: 'hidden',
    backgroundColor: '#000', aspectRatio: 4 / 3,
    borderWidth: 1, borderColor: C.border,
  },
  frameBox: { flex: 1, backgroundColor: '#000' },
  frame: { width: '100%', height: '100%' },
  placeholder: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 24, backgroundColor: C.card,
  },
  placeholderText: { color: C.textSub, fontSize: 16, fontWeight: '600', marginTop: 12 },
  placeholderSub: { color: C.textSub, fontSize: 12, marginTop: 4, textAlign: 'center' },
  retryBtn: {
    marginTop: 16, paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: C.primary + '18', borderRadius: 10,
  },
  retryText: { color: C.primary, fontSize: 14, fontWeight: '600' },

  // ── Detection Panel ──
  detPanel: {
    flex: 1, margin: 16,
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1, borderColor: C.border, padding: 14,
  },
  panelTitle: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 10 },
  detScroll: { flex: 1 },

  // Each detection row
  detItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  detNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: C.primary + '18',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10, marginTop: 1,
  },
  detNumText: { color: C.primary, fontSize: 12, fontWeight: '800' },

  detInfo: { flex: 1 },

  // Line 1: label + distance badge + direction badge
  detLine1: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  detLabel: { color: C.text, fontSize: 15, fontWeight: '700' },
  distBadge: {
    backgroundColor: C.warning + '1A', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6,
  },
  distText: { color: C.warning, fontSize: 12, fontWeight: '700' },
  dirBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, gap: 3,
  },
  dirText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  // Line 2: steps + confidence
  detLine2: { color: C.textSub, fontSize: 12, marginTop: 3 },

  // Empty state
  emptyBox: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { color: C.textSub, fontSize: 14, fontWeight: '600', marginTop: 8 },
  emptySub: { color: C.textSub, fontSize: 12, marginTop: 4, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, borderWidth: 1, borderColor: C.border,
  },
  modalTitle: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 20 },
  modalLabel: {
    color: C.textSub, fontSize: 12, fontWeight: '600',
    marginBottom: 6, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: C.bg, borderRadius: 12, padding: 14,
    color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border, marginBottom: 6,
  },
  hint: { color: C.textSub, fontSize: 11, marginBottom: 20 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, marginRight: 10 },
  cancelText: { color: C.textSub, fontSize: 14, fontWeight: '600' },
  saveBtn: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
