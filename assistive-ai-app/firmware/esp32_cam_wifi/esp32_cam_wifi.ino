/*
 * ESP32-S3 Sense Wi-Fi Camera Firmware
 *
 * Board:   XIAO ESP32S3 Sense (Seeed Studio)
 * Package: esp32 by Espressif Systems (v2.0.14+)
 *
 * Endpoints served:
 *   http://<IP>:81/stream   — MJPEG live stream
 *   http://<IP>/capture     — Single JPEG snapshot
 *   http://<IP>/status      — JSON health/diagnostics
 *
 * Upload settings in Arduino IDE:
 *   Board:        XIAO_ESP32S3
 *   USB CDC:      Enabled
 *   PSRAM:        OPI PSRAM
 *   Partition:    Huge APP (3 MB No OTA / 1 MB SPIFFS)
 */

#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"

// ====================== Wi-Fi Credentials ============================
// Change these to match your network
const char* WIFI_SSID     = "TOYO's iPhone";
const char* WIFI_PASSWORD = "testwifi1234";

// ====================== Camera Pins (XIAO ESP32S3 Sense) =============
#define PWDN_GPIO_NUM   -1
#define RESET_GPIO_NUM  -1
#define XCLK_GPIO_NUM   10
#define SIOD_GPIO_NUM   40
#define SIOC_GPIO_NUM   39
#define Y9_GPIO_NUM     48
#define Y8_GPIO_NUM     11
#define Y7_GPIO_NUM     12
#define Y6_GPIO_NUM     14
#define Y5_GPIO_NUM     16
#define Y4_GPIO_NUM     18
#define Y3_GPIO_NUM     17
#define Y2_GPIO_NUM     15
#define VSYNC_GPIO_NUM  38
#define HREF_GPIO_NUM   47
#define PCLK_GPIO_NUM   13

// ====================== Stream Settings ==============================
#define STREAM_PORT     81
#define FRAME_SIZE      FRAMESIZE_QVGA   // 320x240 — good balance for inference
#define JPEG_QUALITY    12               // 0-63 (lower = better quality, more bytes)
#define XCLK_FREQ       20000000         // 20 MHz

// ====================== Globals ======================================
httpd_handle_t stream_httpd = NULL;
httpd_handle_t camera_httpd = NULL;
unsigned long   lastWifiCheck = 0;

static const char* STREAM_CONTENT_TYPE =
    "multipart/x-mixed-replace;boundary=frame";
static const char* STREAM_BOUNDARY = "\r\n--frame\r\n";
static const char* STREAM_PART =
    "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

// ====================== MJPEG Stream Handler =========================
static esp_err_t stream_handler(httpd_req_t *req) {
    camera_fb_t *fb = NULL;
    esp_err_t res = ESP_OK;
    char part_buf[64];

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

        res = httpd_resp_send_chunk(req, STREAM_BOUNDARY,
                                    strlen(STREAM_BOUNDARY));
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
    httpd_resp_set_hdr(req, "Content-Disposition",
                       "inline; filename=capture.jpg");

    esp_err_t res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
    esp_camera_fb_return(fb);
    return res;
}

// ====================== Status / Health Handler ======================
static esp_err_t status_handler(httpd_req_t *req) {
    char buf[256];
    snprintf(buf, sizeof(buf),
        "{\"status\":\"ok\",\"ip\":\"%s\",\"rssi\":%d,"
        "\"uptime\":%lu,\"free_heap\":%u}",
        WiFi.localIP().toString().c_str(),
        WiFi.RSSI(),
        millis() / 1000,
        ESP.getFreeHeap());

    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    return httpd_resp_send(req, buf, strlen(buf));
}

// ====================== Camera Initialisation ========================
bool initCamera() {
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer   = LEDC_TIMER_0;
    config.pin_d0       = Y2_GPIO_NUM;
    config.pin_d1       = Y3_GPIO_NUM;
    config.pin_d2       = Y4_GPIO_NUM;
    config.pin_d3       = Y5_GPIO_NUM;
    config.pin_d4       = Y6_GPIO_NUM;
    config.pin_d5       = Y7_GPIO_NUM;
    config.pin_d6       = Y8_GPIO_NUM;
    config.pin_d7       = Y9_GPIO_NUM;
    config.pin_xclk     = XCLK_GPIO_NUM;
    config.pin_pclk     = PCLK_GPIO_NUM;
    config.pin_vsync    = VSYNC_GPIO_NUM;
    config.pin_href     = HREF_GPIO_NUM;
    config.pin_sccb_sda = SIOD_GPIO_NUM;
    config.pin_sccb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn     = PWDN_GPIO_NUM;
    config.pin_reset    = RESET_GPIO_NUM;
    config.xclk_freq_hz = XCLK_FREQ;
    config.pixel_format = PIXFORMAT_JPEG;
    config.frame_size   = FRAME_SIZE;
    config.jpeg_quality = JPEG_QUALITY;
    config.fb_count     = 2;
    config.fb_location  = CAMERA_FB_IN_PSRAM;
    config.grab_mode    = CAMERA_GRAB_LATEST;

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("[CAM] Init failed: 0x%x\n", err);
        return false;
    }

    sensor_t *s = esp_camera_sensor_get();
    if (s) {
        s->set_brightness(s, 1);
        s->set_saturation(s, 0);
    }

    Serial.println("[CAM] Camera initialised OK");
    return true;
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
        Serial.printf("\n[WIFI] Connected — IP: %s\n",
                      WiFi.localIP().toString().c_str());
        Serial.printf("[WIFI] Signal strength: %d dBm\n", WiFi.RSSI());
    } else {
        Serial.println("\n[WIFI] Connection FAILED — restarting in 5 s");
        delay(5000);
        ESP.restart();
    }
}

// ====================== HTTP Servers =================================
void startStreamServer() {
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.server_port    = STREAM_PORT;
    config.ctrl_port      = STREAM_PORT + 1;
    config.max_open_sockets = 4;

    httpd_uri_t stream_uri = {
        .uri      = "/stream",
        .method   = HTTP_GET,
        .handler  = stream_handler,
        .user_ctx = NULL
    };

    if (httpd_start(&stream_httpd, &config) == ESP_OK) {
        httpd_register_uri_handler(stream_httpd, &stream_uri);
        Serial.printf("[HTTP] Stream server on port %d\n", STREAM_PORT);
    }
}

void startCameraServer() {
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
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
        Serial.println("[HTTP] Camera server on port 80");
    }
}

// ====================== Wi-Fi Watchdog ===============================
void checkWiFi() {
    if (millis() - lastWifiCheck < 10000) return;   // check every 10 s
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

        if (WiFi.status() == WL_CONNECTED) {
            Serial.printf("[WIFI] Reconnected — IP: %s\n",
                          WiFi.localIP().toString().c_str());
        } else {
            Serial.println("[WIFI] Reconnection failed — will retry");
        }
    }
}

// ====================== Arduino Entry Points =========================
void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println();
    Serial.println("========================================");
    Serial.println("  ESP32-S3 Sense Wi-Fi Camera");
    Serial.println("========================================");

    if (!initCamera()) {
        Serial.println("[FATAL] Camera init failed — halting");
        while (true) delay(1000);
    }

    initWiFi();
    startCameraServer();
    startStreamServer();

    Serial.println("========================================");
    Serial.printf("  Stream:  http://%s:%d/stream\n",
                  WiFi.localIP().toString().c_str(), STREAM_PORT);
    Serial.printf("  Capture: http://%s/capture\n",
                  WiFi.localIP().toString().c_str());
    Serial.printf("  Status:  http://%s/status\n",
                  WiFi.localIP().toString().c_str());
    Serial.println("========================================");
}

void loop() {
    checkWiFi();
    delay(100);
}
