const { query } = require('../config/db');

const create = async ({ userId, token, expiresAt, ipAddress, userAgent }) => {
  const result = await query(
    `INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, token, expiresAt, ipAddress || null, userAgent || null]
  );
  return result.rows[0];
};

const findByToken = async (token) => {
  const result = await query(
    'SELECT * FROM sessions WHERE token = $1 AND expires_at > now()',
    [token]
  );
  return result.rows[0] || null;
};

const deleteByToken = async (token) => {
  await query('DELETE FROM sessions WHERE token = $1', [token]);
};

const deleteExpired = async () => {
  const result = await query('DELETE FROM sessions WHERE expires_at <= now()');
  return result.rowCount;
};

const deleteAllForUser = async (userId) => {
  await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
};

module.exports = { create, findByToken, deleteByToken, deleteExpired, deleteAllForUser };
