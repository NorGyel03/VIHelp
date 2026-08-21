# VIHelp 🦯

### AI-Powered Assistive Wearable for the Visually Impaired

VIHelp is an AI-powered assistive system designed to help visually impaired users
understand their surroundings through real-time computer vision, object detection,
depth estimation, and audio feedback.

The system combines an ESP32-based camera device with an AI inference service,
backend infrastructure, and a mobile application.

---

## 🎯 Problem

Visually impaired users often have difficulty identifying objects, obstacles,
and spatial information in unfamiliar environments.

VIHelp aims to provide an affordable assistive solution that can detect
surrounding objects and communicate useful environmental information through
audio feedback.

---

## 💡 Solution

VIHelp connects four major components:

**Camera Device → AI Processing → Backend → Mobile Application**

The camera captures the user's surroundings, the AI service processes the
visual information, and the resulting detections can be accessed through the
application.

---

## 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │     ESP32 Camera    │
                    │                     │
                    │  Image Acquisition  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    AI Inference     │
                    │                     │
                    │ YOLO Object Detect. │
                    │ Depth Estimation    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Backend API      │
                    │                     │
                    │ Authentication      │
                    │ Devices             │
                    │ Detections          │
                    │ User Management     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Mobile App       │
                    │                     │
                    │ Detection Display   │
                    │ Audio Feedback      │
                    │ Device Management   │
                    └─────────────────────┘
