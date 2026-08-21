/*
 * ESP32-S3 DevKit N16R8 — OV3660 USB Serial Camera Firmware
 *
 * Sends JPEG frames over USB serial so the AI service (app.py) running
 * on your PC can process them.  No Wi-Fi or router needed — just one
 * USB-C cable.
 *
 * Frame protocol (matches ai-service/app.py  SerialCamera class):
 *   0xFF 0xD8            — JPEG SOI marker  (frame-start signal)
 *   4 bytes little-endian— JPEG payload length (uint32)
 *   N bytes              — JPEG payload
 *
 * Board:   ESP32-S3-DevKitC-1  (N16R8 — 16 MB Flash / 8 MB OPI PSRAM)
 * Camera:  OV3660  (3.6 MP DVP parallel)
 * Package: esp32 by Espressif Systems v2.0.14+
 *
 * ── CRITICAL Arduino IDE Settings ──────────────────────────────────────
 *   Board              : ESP32S3 Dev Module
 *   USB CDC On Boot    : Enabled          ← MUST be Enabled for Serial over USB
 *   USB Firmware MSC   : Disabled         ← MUST be Disabled
 *   Flash Size         : 16MB (128Mb)
 *   Partition Scheme   : Huge APP (3MB No OTA / 1MB SPIFFS)
 *   PSRAM              : OPI PSRAM        ← MUST match the R8 die
 *   Upload Speed       : 921600
 *   CPU Frequency      : 240MHz
 *   USB Mode           : Hardware CDC and JTAG
 *
 * ── Wiring — OV3660 to ESP32-S3 DevKit ────────────────────────────────
 *   OV3660 Pin   →  ESP32-S3 GPIO
 *   PWDN            — (leave unconnected or tie to GND)
 *   RESET           — (leave unconnected or tie to 3.3 V)
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
 * ── AI Service .env settings for this mode ─────────────────────────────
 *   CAMERA_MODE=serial
 *   SERIAL_PORT=COM6      ← replace with your actual port (Windows: COMx / Mac-Linux: /dev/tty.usbmodemXXX)
 *   SERIAL_BAUD=921600    ← must match SERIAL_BAUD below
 */

#include "esp_camera.h"

// ====================== Camera Pins — ESP32-S3 DevKit + OV3660 =======
#define PWDN_GPIO_NUM   -1
#define RESET_GPIO_NUM  -1
#define XCLK_GPIO_NUM   15
#define SIOD_GPIO_NUM    4
#define SIOC_GPIO_NUM    5

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

// ====================== Settings =====================================
// OV3660 can do VGA (640×480) comfortably — better detail than QVGA
#define FRAME_SIZE      FRAMESIZE_VGA    // 640×480
#define JPEG_QUALITY    18               // 0-63  balanced quality/size
#define XCLK_FREQ       20000000         // 20 MHz
#define SERIAL_BAUD     921600           // High-speed USB CDC serial
#define FRAME_DELAY_MS  33               // ~30 fps target (1000/33 = 30)

// ====================== Camera Init ==================================
bool initCamera() {
    delay(500);   // let the camera power-rail stabilise

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
        Serial.printf("[CAM] PSRAM OK — %u KB free\n",
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
        Serial.printf("[CAM] Init FAILED: 0x%x\n", err);
        _printTroubleshooting();
        return false;
    }

    // ── OV3660 sensor tuning ─────────────────────────────────────────
    sensor_t *s = esp_camera_sensor_get();
    if (s) {
        Serial.printf("[CAM] Sensor PID: 0x%02X  (OV3660 = 0x3660)\n", s->id.PID);

        // Most OV3660 modules are mounted upside-down — flip to correct
        s->set_vflip(s, 1);
        s->set_hmirror(s, 1);

        // Balanced settings for indoor assistive use
        s->set_brightness(s, 1);
        s->set_contrast(s, 0);
        s->set_saturation(s, 0);
        s->set_whitebal(s, 1);        // auto white balance
        s->set_awb_gain(s, 1);
        s->set_wb_mode(s, 0);         // 0=Auto
        s->set_aec2(s, 1);            // advanced auto exposure
        s->set_ae_level(s, 0);
        s->set_gain_ctrl(s, 1);       // auto gain
        s->set_gainceiling(s, (gainceiling_t)6);
        s->set_bpc(s, 1);
        s->set_wpc(s, 1);
        s->set_raw_gma(s, 1);
        s->set_lenc(s, 1);
        s->set_dcw(s, 1);
    }

    Serial.println("[CAM] OV3660 initialised OK");
    return true;
}

void _printTroubleshooting() {
    Serial.println();
    Serial.println("╔════════════════════════════════════════════════════╗");
    Serial.println("║    CAMERA INIT TROUBLESHOOTING (OV3660)           ║");
    Serial.println("╠════════════════════════════════════════════════════╣");
    Serial.println("║  1. Board  : ESP32S3 Dev Module                    ║");
    Serial.println("║  2. PSRAM  : OPI PSRAM  (Tools → PSRAM)            ║");
    Serial.println("║  3. Flash  : 16MB (128Mb)                          ║");
    Serial.println("║  4. USB CDC On Boot: Enabled                       ║");
    Serial.println("║  5. Check OV3660 wiring vs pin table in sketch     ║");
    Serial.println("║  6. Confirm 3.3 V supply to camera module          ║");
    Serial.println("║  7. Unplug USB → wait 3 s → replug               ║");
    Serial.println("╚════════════════════════════════════════════════════╝");
    if (!psramFound()) {
        Serial.println(">>> PSRAM NOT detected — set Tools → PSRAM → OPI PSRAM <<<");
    }
}

// ====================== Counters =====================================
unsigned long frameCount   = 0;
unsigned long lastStatTime = 0;
unsigned long bytesTotal   = 0;

// ====================== Setup ========================================
void setup() {
    Serial.begin(SERIAL_BAUD);

    // Wait up to 3 s for USB CDC to enumerate on host
    unsigned long t0 = millis();
    while (!Serial && millis() - t0 < 3000) delay(10);
    delay(500);

    Serial.println();
    Serial.println("╔══════════════════════════════════════════════════════╗");
    Serial.println("║   ESP32-S3 DevKit N16R8 — OV3660 USB Serial Camera  ║");
    Serial.println("╚══════════════════════════════════════════════════════╝");
    Serial.printf("[SYS] CPU   : %d MHz\n",   getCpuFrequencyMhz());
    Serial.printf("[SYS] Flash : %d MB\n",    ESP.getFlashChipSize() / (1024 * 1024));
    Serial.printf("[SYS] PSRAM : %s (%d KB free)\n",
                  psramFound() ? "YES" : "NO",
                  psramFound() ? ESP.getFreePsram() / 1024 : 0);
    Serial.printf("[SYS] Heap  : %d KB\n",    ESP.getFreeHeap() / 1024);
    Serial.printf("[SYS] Baud  : %d\n",       SERIAL_BAUD);
    Serial.println("──────────────────────────────────────────────────────");
    Serial.println("[SYS] Set in ai-service/.env:");
    Serial.println("      CAMERA_MODE=serial");
    Serial.println("      SERIAL_PORT=<your COM port>");
    Serial.printf( "      SERIAL_BAUD=%d\n", SERIAL_BAUD);
    Serial.println("══════════════════════════════════════════════════════");

    bool ok = false;
    for (int attempt = 1; attempt <= 3; attempt++) {
        Serial.printf("[CAM] Init attempt %d/3…\n", attempt);
        ok = initCamera();
        if (ok) break;
        delay(1000);
    }

    if (!ok) {
        Serial.println("[FATAL] Camera init failed — halting");
        while (true) delay(1000);
    }

    Serial.println("[OK] Streaming JPEG frames over USB serial…");
    Serial.println("══════════════════════════════════════════════════════");
    lastStatTime = millis();
}

// ====================== Loop — send frames ===========================
void loop() {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("[CAM] Frame capture failed");
        delay(100);
        return;
    }

    // ── Frame header: JPEG SOI marker + 4-byte little-endian length ──
    uint8_t  header[2] = { 0xFF, 0xD8 };
    uint32_t len       = fb->len;

    Serial.write(header, 2);
    Serial.write((uint8_t *)&len, 4);
    Serial.write(fb->buf, fb->len);

    bytesTotal += 6 + fb->len;   // header + length field + payload
    frameCount++;

    esp_camera_fb_return(fb);

    // ── Stats every 5 seconds ──────────────────────────────────────
    if (millis() - lastStatTime >= 5000) {
        float elapsed = (millis() - lastStatTime) / 1000.0f;
        float fps     = frameCount / elapsed;
        float kbps    = (bytesTotal / elapsed) / 1024.0f;

        Serial.printf("[STATS] %.1f FPS  |  %.1f KB/s  |  heap: %u bytes\n",
                      fps, kbps, ESP.getFreeHeap());

        frameCount   = 0;
        bytesTotal   = 0;
        lastStatTime = millis();
    }

    delay(FRAME_DELAY_MS);
}
