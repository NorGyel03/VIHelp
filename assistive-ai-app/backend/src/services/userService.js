const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const sessionModel = require('../models/sessionModel');

const SALT_ROUNDS = 12;

const getProfile = async (userId) => {
  const user = await userModel.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return user;
};

const updateProfile = async (userId, updates) => {
  const fieldMap = {
    firstName: 'first_name',
    middleName: 'middle_name',
    lastName: 'last_name',
    phone: 'phone',
    occupation: 'occupation',
    dob: 'date_of_birth',
    address: 'address',
    profileImage: 'profile_image_url',
  };

  const dbFields = {};
  for (const [key, value] of Object.entries(updates)) {
    const dbKey = fieldMap[key];
    if (dbKey) {
      dbFields[dbKey] = value;
    }
  }

  const user = await userModel.update(userId, dbFields);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return user;
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  if (!newPassword || newPassword.length < 6) {
    const err = new Error('New password must be at least 6 characters');
    err.status = 400;
    throw err;
  }

  const user = await userModel.findByIdWithHash(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    const err = new Error('Current password is incorrect');
    err.status = 401;
    throw err;
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userModel.updatePassword(userId, newHash);

  // Invalidate every session so the user must log in again on other devices
  await sessionModel.deleteAllForUser(userId);
};

// ── Change Email ──────────────────────────────────────────────────────
const updateEmail = async (userId, { newEmail, currentPassword }) => {
  if (!newEmail || !newEmail.includes('@')) {
    const err = new Error('A valid email address is required');
    err.status = 400;
    throw err;
  }

  // Ensure the new email is not already taken
  const taken = await userModel.findByEmail(newEmail.toLowerCase().trim());
  if (taken) {
    const err = new Error('This email address is already in use');
    err.status = 409;
    throw err;
  }

  // Verify current password
  const user = await userModel.findByIdWithHash(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    const err = new Error('Current password is incorrect');
    err.status = 401;
    throw err;
  }

  await userModel.updateEmail(userId, newEmail.toLowerCase().trim());

  // Invalidate all sessions — user must re-login with the new email
  await sessionModel.deleteAllForUser(userId);
};

module.exports = { getProfile, updateProfile, changePassword, updateEmail };
