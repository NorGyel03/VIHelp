const { query } = require('../config/db');

const create = async ({ deviceId, label, confidence, metadata }) => {
  const result = await query(
    `INSERT INTO detections (device_id, label, confidence, metadata)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [deviceId, label, confidence, metadata ? JSON.stringify(metadata) : null]
  );
  return result.rows[0];
};

const findByDeviceId = async (deviceId, { limit = 50, offset = 0 } = {}) => {
  const result = await query(
    `SELECT * FROM detections
     WHERE device_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [deviceId, limit, offset]
  );
  return result.rows;
};

const findByUserId = async (userId, { limit = 50, offset = 0 } = {}) => {
  const result = await query(
    `SELECT d.* FROM detections d
     JOIN devices dev ON dev.id = d.device_id
     WHERE dev.user_id = $1
     ORDER BY d.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
};

const findById = async (id) => {
  const result = await query('SELECT * FROM detections WHERE id = $1', [id]);
  return result.rows[0] || null;
};

module.exports = { create, findByDeviceId, findByUserId, findById };
