const express = require('express');
const userService = require('../services/userService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const user = await userService.getProfile(req.userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const user = await userService.updateProfile(req.userId, req.body);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.put('/password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }

    await userService.changePassword(req.userId, { currentPassword, newPassword });
    res.json({ message: 'Password changed successfully. Please log in again.' });
  } catch (err) {
    next(err);
  }
});

// ── Change Email ──────────────────────────────────────────────────────
router.put('/email', authenticate, async (req, res, next) => {
  try {
    const { newEmail, currentPassword } = req.body;

    if (!newEmail || !currentPassword) {
      return res.status(400).json({ error: 'newEmail and currentPassword are required' });
    }

    await userService.updateEmail(req.userId, { newEmail, currentPassword });
    res.json({ message: 'Email updated. Please sign in with your new email address.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
