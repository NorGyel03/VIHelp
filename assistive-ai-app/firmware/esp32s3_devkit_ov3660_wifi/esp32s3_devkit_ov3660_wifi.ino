/*
 * ESP32-S3 DevKit N16R8 — OV3660 Wi-Fi Camera Firmware
 *
 * Board:   ESP32-S3-DevKitC-1 (Espressif)  — N16R8 variant (16 MB Flash / 8 MB PSRAM)
 * Camera:  OV3660  (3.6 MP, DVP parallel interface)
 * Package: esp32 by Espressif Systems v2.0.14+  (Arduino IDE Board Manager)
 *
 * Endpoints served:
 *   http://<IP>:81/stream   — MJPEG live stream  (AI service Wi-Fi mode)
 *   http://<IP>/capture     — Single JPEG snapshot
 *   http://<IP>/status      — JSON health / diagnostics
 *
 * ── CRITICAL Arduino IDE Settings ──────────────────────────────────────
 *   Board          : ESP32S3 Dev Module
 *   USB CDC On Boot: Disabled          ← use this when plugged into USB-UART port
 *                    Enabled           ← use this when plugged into USB-OTG port
 *   Flash Size     : 16MB (128Mb)
 *   Partition Scheme: Huge APP (3MB No OTA / 1MB SPIFFS)
 *   PSRAM          : OPI PSRAM         ← MUST match the R8 chip
 *   Upload Speed   : 921600
 *   CPU Frequency  : 240MHz (WiFi/BT)
 *
 * ── Wiring — OV3660 to ESP32-S3 DevKit ────────────────────────────────
 *   OV3660 Pin   →  ESP32-S3 GPIO
 *   PWDN            — (not connected / tie to GND on some modules)
 *   RESET           — (not connected / tie to 3.3 V on some modules)
 *   XCLK            GPIO 15
 *   SIOD (SDA)      GPIO 4
 *   SIOC (SCL)      GPIO 5
 *   D7  (Y9)        GPIO 16
 *   D6  (Y8)        GPIO 17
 *   D5  (Y7)        GPIO 18
 *   D4  (Y6)        GPIO 12
 *   D3  (Y5)        GPIO 10
 *   D2  (Y4)        GPIO 8
 *   D1  (Y3)        GPIO 9
 *   D0  (Y2)        GPIO 11
 *   VSYNC           GPIO 6
 *   HREF            GPIO 7
 *   PCLK            GPIO 13
 *   3.3 V           3.3 V
 *   GND             GND
 *
 * NOTE: If your DevKit board came with the OV3660 pre-wired / on a camera
 *       daughter-board, verify the pin numbers against your board's
 *       schematic before flashing.  The pins above follow the standard
 *       Espressif ESP32-S3-EYE reference layout.
 */

#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"

// ====================== Wi-Fi Credentials ============================
// ▶ Change these to your network SSID and password
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ====================== Camera Pins — ESP32-S3 DevKit + OV3660 =======
#define PWDN_GPIO_NUM   -1
#define RESET_GPIO_NUM  -1
#define XCLK_GPIO_NUM   15
#define SIOD_GPIO_NUM    4
#define SIOC_GPIO_NUM    5

// Parallel data bus (D0–D7 / Y2–Y9)
#define Y9_GPIO_NUM     16
#define Y8_GPIO_NUM     17
#define Y7_GPIO_NUM     18
#define Y6_GPIO_NUM     12
#define Y5_GPIO_NUM     10
#define Y4_GPIO_NUM      8
#define Y3_GPIO_NUM      9
#define Y2_GPIO_NUM     11

#define VSYNC_GPIO_NUM   6
#define HREF_GPIO_NUM    7
#define PCLK_GPIO_NUM   13

// ====================== Stream / Quality Settings ====================
// OV3660 is a 3.6 MP sensor — VGA gives much better quality than QVGA
// while staying fast enough for real-time AI inference.
#define STREAM_PORT     81
#define FRAME_SIZE      FRAMESIZE_VGA    // 640×480 — good quality + speed
#define JPEG_QUALITY    10               // 0-63  lower = better (10 is good for OV3660)
#define XCLK_FREQ       20000000         // 20 MHz

// ====================== Globals ======================================
httpd_handle_t stream_httpd = NULL;
httpd_handle_t camera_httpd = NULL;
unsigned long  lastWifiCheck = 0;

static const char* STREAM_CONTENT_TYPE =
    "multipart/x-mixed-replace;boundary=frame";
static const char* STREAM_BOUNDARY = "\r\n--frame\r\n";
static const char* STREAM_PART =
    "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

// ====================== MJPEG Stream Handler =========================
static esp_err_t stream_handler(httpd_req_t *req) {
    camera_fb_t *fb  = NULL;
    esp_err_t    res = ESP_OK;
    char         part_buf[64];

    res = httpd_resp_set_type(req, STREAM_CONTENT_TYPE);
    if (res != ESP_OK) return res;

    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_hdr(req, "X-Framerate", "25");

    Serial.println("[STREAM] Client connected");

    while (true) {
        fb = esp_camera_fb_get();
        if (!fb) {
            Serial.println("[STREAM] Frame capture failed");
            res = ESP_FAIL;
            break;
        }

        size_t hlen = snprintf(part_buf, 64, STREAM_PART, fb->len);

        res = httpd_resp_send_chunk(req, STREAM_BOUNDARY, strlen(STREAM_BOUNDARY));
        if (res == ESP_OK)
            res = httpd_resp_send_chunk(req, part_buf, hlen);
        if (res == ESP_OK)
            res = httpd_resp_send_chunk(req, (const char *)fb->buf, fb->len);

        esp_camera_fb_return(fb);

        if (res != ESP_OK) {
            Serial.println("[STREAM] Client disconnected");
            break;
        }
    }
    return res;
}

// ====================== Single Capture Handler =======================
static esp_err_t capture_handler(httpd_req_t *req) {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }

    httpd_resp_set_type(req, "image/jpeg");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");

    esp_err_t res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
    esp_camera_fb_return(fb);
    return res;
}

// ====================== Status / Health Handler ======================
static esp_err_t status_handler(httpd_req_t *req) {
    sensor_t *s = esp_camera_sensor_get();
    char buf[320];
    snprintf(buf, sizeof(buf),
        "{"
        "\"status\":\"ok\","
        "\"board\":\"ESP32-S3-DevKit-N16R8\","
        "\"camera\":\"OV3660\","
        "\"sensor_pid\":\"0x%02X\","
        "\"ip\":\"%s\","
        "\"rssi\":%d,"
        "\"uptime\":%lu,"
        "\"free_heap\":%u,"
        "\"psram_free\":%u,"
        "\"frame_size\":\"VGA\","
        "\"jpeg_quality\":%d"
        "}",
        s ? s->id.PID : 0,
        WiFi.localIP().toString().c_str(),
        WiFi.RSSI(),
        millis() / 1000,
        ESP.getFreeHeap(),
        ESP.getFreePsram(),
        JPEG_QUALITY);

    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    return httpd_resp_send(req, buf, strlen(buf));
}

// ====================== Camera Initialisation ========================
bool initCamera() {
    camera_config_t config;
    config.ledc_channel  = LEDC_CHANNEL_0;
    config.ledc_timer    = LEDC_TIMER_0;
    config.pin_d0        = Y2_GPIO_NUM;
    config.pin_d1        = Y3_GPIO_NUM;
    config.pin_d2        = Y4_GPIO_NUM;
    config.pin_d3        = Y5_GPIO_NUM;
    config.pin_d4        = Y6_GPIO_NUM;
    config.pin_d5        = Y7_GPIO_NUM;
    config.pin_d6        = Y8_GPIO_NUM;
    config.pin_d7        = Y9_GPIO_NUM;
    config.pin_xclk      = XCLK_GPIO_NUM;
    config.pin_pclk      = PCLK_GPIO_NUM;
    config.pin_vsync     = VSYNC_GPIO_NUM;
    config.pin_href      = HREF_GPIO_NUM;
    config.pin_sccb_sda  = SIOD_GPIO_NUM;
    config.pin_sccb_scl  = SIOC_GPIO_NUM;
    config.pin_pwdn      = PWDN_GPIO_NUM;
    config.pin_reset     = RESET_GPIO_NUM;
    config.xclk_freq_hz  = XCLK_FREQ;
    config.pixel_format  = PIXFORMAT_JPEG;
    config.grab_mode     = CAMERA_GRAB_LATEST;

    // Smart PSRAM handling — don't force fb_location (causes crashes)
    if (psramFound()) {
        Serial.printf("[CAM] PSRAM detected: %u KB free\n",
                      ESP.getFreePsram() / 1024);
        config.frame_size   = FRAMESIZE_VGA;
        config.jpeg_quality = 12;
        config.fb_count     = 2;
        // ⚠️  DO NOT set config.fb_location = CAMERA_FB_IN_PSRAM (causes crashes)
    } else {
        Serial.println("[CAM] ⚠  NO PSRAM — fallback mode");
        config.frame_size   = FRAMESIZE_QQVGA;
        config.jpeg_quality = 15;
        config.fb_count     = 1;
    }

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("[CAM] Init failed: 0x%x\n", err);
        _printCamTroubleshooting();
        return false;
    }

    // ── OV3660-specific sensor tuning ────────────────────────────────
    sensor_t *s = esp_camera_sensor_get();
    if (s) {
        Serial.printf("[CAM] Sensor PID: 0x%02X  (OV3660 = 0x3660)\n", s->id.PID);

        // OV3660 image is flipped 180° on most modules — correct it here
        s->set_vflip(s, 1);       // vertical flip
        s->set_hmirror(s, 1);     // horizontal mirror

        // Colour & exposure tuning for real-world indoor use
        s->set_brightness(s, 1);  // +1 brightness  (-2 to +2)
        s->set_contrast(s, 0);    // neutral contrast
        s->set_saturation(s, 0);  // neutral saturation
        s->set_whitebal(s, 1);    // auto white balance ON
        s->set_awb_gain(s, 1);    // AWB gain ON
        s->set_wb_mode(s, 0);     // 0=Auto, 1=Sunny, 2=Cloudy, 3=Office, 4=Home
        s->set_aec2(s, 1);        // auto exposure control DSP ON
        s->set_ae_level(s, 0);    // exposure level neutral
        s->set_aec_value(s, 300); // initial AEC value
        s->set_gain_ctrl(s, 1);   // auto gain ON
        s->set_agc_gain(s, 0);    // initial gain
        s->set_gainceiling(s, (gainceiling_t)6); // max gain ceiling
        s->set_bpc(s, 1);         // black pixel correction
        s->set_wpc(s, 1);         // white pixel correction
        s->set_raw_gma(s, 1);     // gamma correction
        s->set_lenc(s, 1);        // lens correction
        s->set_dcw(s, 1);         // downsize EN
    }

    Serial.println("[CAM] OV3660 initialised OK");
    return true;
}

void _printCamTroubleshooting() {
    Serial.println();
    Serial.println("╔═══════════════════════════════════════════════════╗");
    Serial.println("║      CAMERA INIT TROUBLESHOOTING (OV3660)        ║");
    Serial.println("╠═══════════════════════════════════════════════════╣");
    Serial.println("║  1. Board: ESP32S3 Dev Module                     ║");
    Serial.println("║  2. PSRAM: OPI PSRAM  (Tools → PSRAM)             ║");
    Serial.println("║  3. Flash: 16MB (128Mb)                           ║");
    Serial.println("║  4. USB CDC On Boot: Enabled                      ║");
    Serial.println("║  5. Verify OV3660 wiring against the pin table    ║");
    Serial.println("║     at the top of this sketch                     ║");
    Serial.println("║  6. Check 3.3 V power to the camera module        ║");
    Serial.println("║  7. Unplug USB → wait 3 s → replug               ║");
    Serial.println("╚═══════════════════════════════════════════════════╝");
    if (!psramFound()) {
        Serial.println(">>> PSRAM NOT detected — enable OPI PSRAM in Tools <<<");
    }
}

// ====================== Wi-Fi Initialisation =========================
void initWiFi() {
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    WiFi.setSleep(false);   // keep radio awake for low-latency streaming

    Serial.print("[WIFI] Connecting");
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 40) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[WIFI] Connected  IP: %s  RSSI: %d dBm\n",
                      WiFi.localIP().toString().c_str(), WiFi.RSSI());
    } else {
        Serial.println("\n[WIFI] Connection FAILED — restarting in 5 s");
        delay(5000);
        ESP.restart();
    }
}

// ====================== HTTP Servers =================================
void startStreamServer() {
    httpd_config_t config    = HTTPD_DEFAULT_CONFIG();
    config.server_port       = STREAM_PORT;
    config.ctrl_port         = STREAM_PORT + 1;
    config.max_open_sockets  = 4;

    httpd_uri_t stream_uri = {
        .uri      = "/stream",
        .method   = HTTP_GET,
        .handler  = stream_handler,
        .user_ctx = NULL
    };

    if (httpd_start(&stream_httpd, &config) == ESP_OK) {
        httpd_register_uri_handler(stream_httpd, &stream_uri);
        Serial.printf("[HTTP] Stream server  → http://%s:%d/stream\n",
                      WiFi.localIP().toString().c_str(), STREAM_PORT);
    }
}

void startCameraServer() {
    httpd_config_t config   = HTTPD_DEFAULT_CONFIG();
    config.server_port      = 80;
    config.max_open_sockets = 4;

    httpd_uri_t capture_uri = {
        .uri = "/capture", .method = HTTP_GET,
        .handler = capture_handler, .user_ctx = NULL
    };
    httpd_uri_t status_uri = {
        .uri = "/status", .method = HTTP_GET,
        .handler = status_handler, .user_ctx = NULL
    };

    if (httpd_start(&camera_httpd, &config) == ESP_OK) {
        httpd_register_uri_handler(camera_httpd, &capture_uri);
        httpd_register_uri_handler(camera_httpd, &status_uri);
        Serial.printf("[HTTP] Capture server → http://%s/capture\n",
                      WiFi.localIP().toString().c_str());
        Serial.printf("[HTTP] Status         → http://%s/status\n",
                      WiFi.localIP().toString().c_str());
    }
}

// ====================== Wi-Fi Watchdog ===============================
void checkWiFi() {
    if (millis() - lastWifiCheck < 10000) return;
    lastWifiCheck = millis();

    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[WIFI] Lost connection — reconnecting…");
        WiFi.disconnect();
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

        int attempts = 0;
        while (WiFi.status() != WL_CONNECTED && attempts < 20) {
            delay(500);
            attempts++;
        }

        if (WiFi.status() == WL_CONNECTED)
            Serial.printf("[WIFI] Reconnected  IP: %s\n",
                          WiFi.localIP().toString().c_str());
        else
            Serial.println("[WIFI] Reconnect failed — will retry next cycle");
    }
}

// ====================== Arduino Entry Points =========================
void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println();
    Serial.println("╔══════════════════════════════════════════════════════╗");
    Serial.println("║   ESP32-S3 DevKit N16R8 — OV3660 Wi-Fi Camera       ║");
    Serial.println("╚══════════════════════════════════════════════════════╝");
    Serial.printf("[SYS] CPU: %d MHz  |  Flash: %d MB  |  PSRAM: %d KB\n",
                  getCpuFrequencyMhz(),
                  ESP.getFlashChipSize() / (1024 * 1024),
                  ESP.getPsramSize() / 1024);

    // Camera — retry up to 3 times
    bool camOk = false;
    for (int i = 1; i <= 3 && !camOk; i++) {
        Serial.printf("[CAM] Init attempt %d/3…\n", i);
        camOk = initCamera();
        if (!camOk) delay(1000);
    }

    if (!camOk) {
        Serial.println("[FATAL] Camera init failed after 3 attempts — halting");
        while (true) delay(1000);
    }

    initWiFi();
    startCameraServer();
    startStreamServer();

    Serial.println();
    Serial.println("══════════════════════════════════════════════════════");
    Serial.println("  ✓  Ready!  Set AI service .env:");
    Serial.println("     CAMERA_MODE=wifi");
    Serial.printf("     ESP32_STREAM_URL=http://%s:%d/stream\n",
                  WiFi.localIP().toString().c_str(), STREAM_PORT);
    Serial.println("══════════════════════════════════════════════════════");
}

void loop() {
    checkWiFi();
    delay(100);
}
