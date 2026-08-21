const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const sessionModel = require('../models/sessionModel');
const passwordResetModel = require('../models/passwordResetModel');

const SALT_ROUNDS = 12;
const OTP_EXPIRY_MINUTES = 15;

// ── Register ─────────────────────────────────────────────────────────
const register = async ({
  email,
  password,
  firstName,
  middleName,
  lastName,
  phone,
  occupation,
  dob,
  address,
}) => {
  const existing = await userModel.findByEmail(email);
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await userModel.create({
    email,
    passwordHash,
    firstName,
    middleName,
    lastName,
    phone,
    occupation,
    dateOfBirth: dob || null,
    address,
  });

  const token = generateToken(user.id);
  const expiresAt = sessionExpiry();

  await sessionModel.create({ userId: user.id, token, expiresAt });

  return { user, token };
};

// ── Login (email OR phone) ────────────────────────────────────────────
const login = async (identifier, password, { ipAddress, userAgent } = {}) => {
  // Accept either email or phone number
  const user = await userModel.findByEmailOrPhone(identifier);
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const token = generateToken(user.id);
  const expiresAt = sessionExpiry();

  await sessionModel.create({ userId: user.id, token, expiresAt, ipAddress, userAgent });

  const profile = await userModel.findById(user.id);
  return { user: profile, token };
};

// ── Logout ───────────────────────────────────────────────────────────
const logout = async (token) => {
  await sessionModel.deleteByToken(token);
};

// ── Forgot Password ───────────────────────────────────────────────────
const forgotPassword = async (email) => {
  const user = await userModel.findByEmail(email);
  if (!user) {
    const err = new Error('No account found with this email address');
    err.status = 404;
    throw err;
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, 10);

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

  await passwordResetModel.create({ email, otpHash, expiresAt });

  // ⚠️  In production: send `otp` via email — never return it here.
  // For development/demo, we return it so the app can display it.
  return {
    message: `OTP sent. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    otp,            // REMOVE in production
    expiresAt,
  };
};

// ── Reset Password ────────────────────────────────────────────────────
const resetPassword = async (email, otp, newPassword) => {
  if (!newPassword || newPassword.length < 6) {
    const err = new Error('New password must be at least 6 characters');
    err.status = 400;
    throw err;
  }

  const reset = await passwordResetModel.findByEmail(email);
  if (!reset) {
    const err = new Error('OTP has expired or already been used. Please request a new one.');
    err.status = 400;
    throw err;
  }

  const valid = await bcrypt.compare(otp, reset.otp_hash);
  if (!valid) {
    const err = new Error('Incorrect OTP code. Please check and try again.');
    err.status = 400;
    throw err;
  }

  // Mark OTP as consumed
  await passwordResetModel.markUsed(reset.id);

  // Reset password
  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const user = await userModel.findByEmail(email);
  await userModel.updatePassword(user.id, newHash);

  // Invalidate all existing sessions
  await sessionModel.deleteAllForUser(user.id);

  return { message: 'Password reset successfully. You can now log in with your new password.' };
};

// ── Helpers ──────────────────────────────────────────────────────────
const generateToken = (userId) =>
  jwt.sign({ userId, jti: crypto.randomUUID() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

const sessionExpiry = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
};

module.exports = { register, login, logout, forgotPassword, resetPassword, verifyToken };
