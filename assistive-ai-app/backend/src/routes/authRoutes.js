const express = require('express');
const authService = require('../services/authService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── Register ─────────────────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, firstName, middleName, lastName, phone, occupation, dob, address } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.register({
      email,
      password,
      firstName,
      middleName,
      lastName,
      phone,
      occupation,
      dob,
      address,
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// ── Login (email OR phone number) ─────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    // Accept `identifier` (phone or email) or legacy `email` field
    const identifier = req.body.identifier || req.body.email;
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/phone and password are required' });
    }

    const result = await authService.login(identifier, password, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Logout ───────────────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await authService.logout(req.token);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// ── Forgot Password — request OTP ────────────────────────────────────
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await authService.forgotPassword(email.toLowerCase().trim());
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Reset Password — verify OTP + set new password ───────────────────
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'email, otp, and newPassword are required' });
    }

    const result = await authService.resetPassword(
      email.toLowerCase().trim(),
      otp.trim(),
      newPassword
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
