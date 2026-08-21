-- V4__detections.sql
-- AI detection results from ESP32 devices.

CREATE TABLE detections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id   UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    label       VARCHAR(255) NOT NULL,
    confidence  REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_detections_device_id ON detections (device_id);
CREATE INDEX idx_detections_label ON detections (label);
CREATE INDEX idx_detections_created_at ON detections (created_at DESC);
