-- V2__devices.sql
-- ESP32 wearable devices linked to users.

CREATE TABLE devices (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name       VARCHAR(150) NOT NULL,
    device_identifier VARCHAR(255) NOT NULL UNIQUE,
    firmware_version  VARCHAR(50),
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_devices_user_id ON devices (user_id);
CREATE INDEX idx_devices_identifier ON devices (device_identifier);
