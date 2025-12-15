const { pool } = require('../config/db');
async function suggest(q, limit = 5) {
  const { rows } = await pool.query(
    `SELECT name, slug FROM products WHERE status='active' AND name ILIKE $1 ORDER BY created_at DESC LIMIT $2`,
    ['%' + q + '%', limit]
  );
  return rows;
}
module.exports = { suggest };
