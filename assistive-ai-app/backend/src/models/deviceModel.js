const { query } = require('../config/db');

const findByUserId = async (userId) => {
  const result = await query(
    'SELECT * FROM devices WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
};

const findById = async (id) => {
  const result = await query('SELECT * FROM devices WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const findByIdentifier = async (deviceIdentifier) => {
  const result = await query(
    'SELECT * FROM devices WHERE device_identifier = $1',
    [deviceIdentifier]
  );
  return result.rows[0] || null;
};

const create = async ({ userId, deviceName, deviceIdentifier, firmwareVersion }) => {
  const result = await query(
    `INSERT INTO devices (user_id, device_name, device_identifier, firmware_version)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, deviceName, deviceIdentifier, firmwareVersion || null]
  );
  return result.rows[0];
};

const updateLastSeen = async (id) => {
  const result = await query(
    'UPDATE devices SET last_seen_at = now() WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0] || null;
};

const deactivate = async (id) => {
  const result = await query(
    'UPDATE devices SET is_active = FALSE WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0] || null;
};

module.exports = { findByUserId, findById, findByIdentifier, create, updateLastSeen, deactivate };
