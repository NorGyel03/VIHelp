const { query } = require('../config/db');

/**
 * Delete any existing (possibly unused) resets for this email, then create a new one.
 */
const create = async ({ email, otpHash, expiresAt }) => {
  await query('DELETE FROM password_resets WHERE email = $1', [email]);

  const result = await query(
    `INSERT INTO password_resets (email, otp_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [email, otpHash, expiresAt]
  );
  return result.rows[0];
};

/**
 * Find the most recent valid (unused, non-expired) reset record for an email.
 */
const findByEmail = async (email) => {
  const result = await query(
    `SELECT * FROM password_resets
     WHERE email = $1 AND used = false AND expires_at > now()
     ORDER BY created_at DESC
     LIMIT 1`,
    [email]
  );
  return result.rows[0] || null;
};

/**
 * Mark a reset record as used so it cannot be replayed.
 */
const markUsed = async (id) => {
  await query('UPDATE password_resets SET used = true WHERE id = $1', [id]);
};

module.exports = { create, findByEmail, markUsed };
