const detectionModel = require('../models/detectionModel');
const deviceModel = require('../models/deviceModel');

const recordDetection = async (userId, { deviceId, label, confidence, metadata }) => {
  const device = await deviceModel.findById(deviceId);
  if (!device || device.user_id !== userId) {
    const err = new Error('Device not found');
    err.status = 404;
    throw err;
  }

  return detectionModel.create({ deviceId, label, confidence, metadata });
};

const getDetectionsForDevice = async (userId, deviceId, options) => {
  const device = await deviceModel.findById(deviceId);
  if (!device || device.user_id !== userId) {
    const err = new Error('Device not found');
    err.status = 404;
    throw err;
  }

  return detectionModel.findByDeviceId(deviceId, options);
};

const getDetectionsForUser = async (userId, options) => {
  return detectionModel.findByUserId(userId, options);
};

module.exports = { recordDetection, getDetectionsForDevice, getDetectionsForUser };
