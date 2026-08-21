const express = require('express');
const deviceService = require('../services/deviceService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { deviceName, deviceIdentifier, firmwareVersion } = req.body;

    if (!deviceName || !deviceIdentifier) {
      return res.status(400).json({ error: 'deviceName and deviceIdentifier are required' });
    }

    const device = await deviceService.registerDevice(req.userId, {
      deviceName,
      deviceIdentifier,
      firmwareVersion,
    });

    res.status(201).json({ device });
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const devices = await deviceService.getUserDevices(req.userId);
    res.json({ devices });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const devices = await deviceService.getUserDevices(req.userId);
    res.json({ devices });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/heartbeat', authenticate, async (req, res, next) => {
  try {
    const device = await deviceService.heartbeat(req.params.id, req.userId);
    res.json({ device });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const device = await deviceService.deactivateDevice(req.params.id, req.userId);
    res.json({ device });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
