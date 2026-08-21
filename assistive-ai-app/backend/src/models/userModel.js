const { query } = require('../config/db');

const SAFE_COLUMNS = `
  id, email, first_name, middle_name, last_name,
  phone, occupation, date_of_birth, address,
  profile_image_url, created_at, updated_at
`;

const findByEmail = async (email) => {
  const result = await query(
    'SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
};

/** Match by email OR phone — used for flexible login. */
const findByEmailOrPhone = async (identifier) => {
  const result = await query(
    `SELECT id, email, password_hash, first_name, last_name
     FROM users
     WHERE email = $1 OR phone = $1`,
    [identifier]
  );
  return result.rows[0] || null;
};

/** Update the user's email address. */
const updateEmail = async (id, email) => {
  await query(
    'UPDATE users SET email = $1, updated_at = now() WHERE id = $2',
    [email, id]
  );
};

const findById = async (id) => {
  const result = await query(
    `SELECT ${SAFE_COLUMNS} FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const create = async ({
  email,
  passwordHash,
  firstName,
  middleName,
  lastName,
  phone,
  occupation,
  dateOfBirth,
  address,
}) => {
  const result = await query(
    `INSERT INTO users
       (email, password_hash, first_name, middle_name, last_name, phone, occupation, date_of_birth, address)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${SAFE_COLUMNS}`,
    [email, passwordHash, firstName, middleName, lastName, phone, occupation, dateOfBirth || null, address]
  );
  return result.rows[0];
};

const update = async (id, fields) => {
  const allowed = [
    'first_name', 'middle_name', 'last_name',
    'phone', 'occupation', 'date_of_birth',
    'address', 'profile_image_url',
  ];

  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(fields)) {
    if (allowed.includes(key)) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return findById(id);

  setClauses.push(`updated_at = now()`);
  values.push(id);

  const result = await query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING ${SAFE_COLUMNS}`,
    values
  );
  return result.rows[0] || null;
};

const findByIdWithHash = async (id) => {
  const result = await query(
    'SELECT id, email, password_hash FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

const updatePassword = async (id, passwordHash) => {
  await query(
    'UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2',
    [passwordHash, id]
  );
};

module.exports = {
  findByEmail,
  findByEmailOrPhone,
  findById,
  findByIdWithHash,
  create,
  update,
  updatePassword,
  updateEmail,
};
