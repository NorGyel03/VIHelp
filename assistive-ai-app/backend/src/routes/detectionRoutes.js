const express = require('express');
const detectionService = require('../services/detectionService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { deviceId, label, confidence, metadata } = req.body;

    if (!deviceId || !label || confidence === undefined) {
      return res.status(400).json({ error: 'deviceId, label, and confidence are required' });
    }

    const detection = await detectionService.recordDetection(req.userId, {
      deviceId,
      label,
      confidence,
      metadata,
    });

    res.status(201).json({ detection });
  } catch (err) {
    next(err);
  }
});

router.get('/device/:deviceId', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const detections = await detectionService.getDetectionsForDevice(
      req.userId,
      req.params.deviceId,
      { limit, offset }
    );

    res.json({ detections });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const detections = await detectionService.getDetectionsForUser(req.userId, { limit, offset });
    res.json({ detections });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
