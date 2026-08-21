/*
 * ESP32-S3 Sense USB Serial Camera Firmware
 *
 * Sends JPEG frames over USB serial for the AI service running on the PC.
 * No Wi-Fi needed — the ESP32 is powered and communicates via the same
 * USB-C cable.
 *
 * Frame protocol (matches VIhelp / SerialCamera):
 *   0xFF 0xD8                — JPEG SOI marker (frame start signal)
 *   4 bytes little-endian    — JPEG payload length
 *   N bytes                  — JPEG payload
 *
 * Board:      XIAO ESP32S3 Sense (Seeed Studio)
 * Package:    esp32 by Espressif Systems (v2.0.14+)
 *
 * ── CRITICAL Arduino IDE Settings ──────────────────────────────────
 *   Board:                    XIAO_ESP32S3
 *   USB CDC On Boot:          Enabled
 *   USB Firmware MSC On Boot: Disabled   ← MUST be Disabled!
 *   PSRAM:                    OPI PSRAM  ← MUST be OPI PSRAM!
 *   Partition Scheme:         Default with spiffs (3MB APP/1.5MB SPIFFS)
 *   USB Mode:                 Hardware CDC and JTAG
 *   Upload Mode:              UART0 / Hardware CDC
 */

#include "esp_camera.h"

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

// ====================== Settings =====================================
#define FRAME_SIZE      FRAMESIZE_QVGA   // 320x240
#define JPEG_QUALITY    12               // 0-63 (lower = better)
#define XCLK_FREQ       20000000         // 20 MHz
#define SERIAL_BAUD     921600           // Fast baud for frame data
#define FRAME_DELAY_MS  30               // ~30 fps target

// ====================== Camera Init ==================================
bool initCamera() {
    // Give the camera module time to power up
    delay(500);

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
    config.grab_mode    = CAMERA_GRAB_LATEST;

    // Check if PSRAM is available — it's required for camera
    if (psramFound()) {
        Serial.println("[CAM] PSRAM found — using PSRAM frame buffers");
        config.frame_size   = FRAME_SIZE;
        config.jpeg_quality = JPEG_QUALITY;
        config.fb_count     = 2;
        config.fb_location  = CAMERA_FB_IN_PSRAM;
    } else {
        Serial.println("[CAM] ⚠ NO PSRAM — using limited settings");
        Serial.println("[CAM]   Enable PSRAM in Arduino IDE: Tools → PSRAM → OPI PSRAM");
        config.frame_size   = FRAMESIZE_QVGA;
        config.jpeg_quality = 20;
        config.fb_count     = 1;
        config.fb_location  = CAMERA_FB_IN_DRAM;
    }

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("[CAM] Init failed: 0x%x\n", err);

        // Print diagnostic info
        Serial.println();
        Serial.println("╔══════════════════════════════════════════════╗");
        Serial.println("║         CAMERA INIT TROUBLESHOOTING         ║");
        Serial.println("╠══════════════════════════════════════════════╣");
        Serial.println("║                                              ║");
        Serial.println("║  1. Check camera ribbon cable is seated      ║");
        Serial.println("║     firmly in the expansion board connector  ║");
        Serial.println("║                                              ║");
        Serial.println("║  2. Arduino IDE → Tools → Board:             ║");
        Serial.println("║     Select: XIAO_ESP32S3                     ║");
        Serial.println("║                                              ║");
        Serial.println("║  3. Arduino IDE → Tools → PSRAM:             ║");
        Serial.println("║     Select: OPI PSRAM                        ║");
        Serial.println("║                                              ║");
        Serial.println("║  4. Unplug USB, wait 3 sec, replug           ║");
        Serial.println("║                                              ║");
        Serial.println("║  5. If still failing, gently re-seat the     ║");
        Serial.println("║     camera module on the expansion board     ║");
        Serial.println("╚══════════════════════════════════════════════╝");

        if (!psramFound()) {
            Serial.println();
            Serial.println(">>> PSRAM was NOT detected! This is likely the cause. <<<");
            Serial.println(">>> Go to: Tools → PSRAM → OPI PSRAM, then re-upload. <<<");
        }

        return false;
    }

    sensor_t *s = esp_camera_sensor_get();
    if (s) {
        s->set_brightness(s, 1);
        s->set_saturation(s, 0);
        Serial.printf("[CAM] Sensor PID: 0x%02X\n", s->id.PID);
    }

    Serial.println("[CAM] Camera initialised OK");
    return true;
}

// ====================== Frame Counter ================================
unsigned long frameCount   = 0;
unsigned long lastStatTime = 0;

// ====================== Setup ========================================
void setup() {
    Serial.begin(SERIAL_BAUD);

    // Wait for USB CDC serial to be ready
    unsigned long t0 = millis();
    while (!Serial && millis() - t0 < 3000) {
        delay(10);
    }
    delay(500);

    Serial.println();
    Serial.println("========================================");
    Serial.println("  ESP32-S3 Sense — USB Serial Camera");
    Serial.println("========================================");
    Serial.printf("[SYS] CPU freq:  %d MHz\n", getCpuFrequencyMhz());
    Serial.printf("[SYS] PSRAM:     %s (%d KB free)\n",
                  psramFound() ? "YES" : "NO",
                  psramFound() ? ESP.getFreePsram() / 1024 : 0);
    Serial.printf("[SYS] Free heap: %d KB\n", ESP.getFreeHeap() / 1024);
    Serial.printf("[SYS] Baud:      %d\n", SERIAL_BAUD);
    Serial.println("========================================");

    // Try camera init up to 3 times
    bool ok = false;
    for (int attempt = 1; attempt <= 3; attempt++) {
        Serial.printf("[CAM] Init attempt %d/3...\n", attempt);
        ok = initCamera();
        if (ok) break;
        Serial.println("[CAM] Retrying in 1 second...");
        delay(1000);
    }

    if (!ok) {
        Serial.println("[FATAL] Camera init failed after 3 attempts — halting");
        Serial.println("[FATAL] See troubleshooting steps above");
        while (true) delay(1000);
    }

    Serial.println("[OK] Streaming JPEG frames over Serial…");
    Serial.println("========================================");
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

    // ── Send frame header: SOI marker + 4-byte length ──
    uint8_t header[2] = { 0xFF, 0xD8 };
    Serial.write(header, 2);

    uint32_t len = fb->len;
    Serial.write((uint8_t *)&len, 4);       // little-endian

    // ── Send JPEG payload ──
    Serial.write(fb->buf, fb->len);

    esp_camera_fb_return(fb);
    frameCount++;

    // ── Print stats every 5 seconds ──
    if (millis() - lastStatTime >= 5000) {
        float fps = frameCount / ((millis() - lastStatTime) / 1000.0);
        Serial.printf("[STATS] %.1f FPS, free heap: %u bytes\n",
                      fps, ESP.getFreeHeap());
        frameCount   = 0;
        lastStatTime = millis();
    }

    delay(FRAME_DELAY_MS);
}
