const deviceModel = require('../models/deviceModel');

const registerDevice = async (userId, { deviceName, deviceIdentifier, firmwareVersion }) => {
  const existing = await deviceModel.findByIdentifier(deviceIdentifier);
  if (existing) {
    const err = new Error('Device already registered');
    err.status = 409;
    throw err;
  }

  return deviceModel.create({ userId, deviceName, deviceIdentifier, firmwareVersion });
};

const getUserDevices = async (userId) => {
  return deviceModel.findByUserId(userId);
};

const heartbeat = async (deviceId, userId) => {
  const device = await deviceModel.findById(deviceId);
  if (!device || device.user_id !== userId) {
    const err = new Error('Device not found');
    err.status = 404;
    throw err;
  }
  return deviceModel.updateLastSeen(deviceId);
};

const deactivateDevice = async (deviceId, userId) => {
  const device = await deviceModel.findById(deviceId);
  if (!device || device.user_id !== userId) {
    const err = new Error('Device not found');
    err.status = 404;
    throw err;
  }
  return deviceModel.deactivate(deviceId);
};

module.exports = { registerDevice, getUserDevices, heartbeat, deactivateDevice };
