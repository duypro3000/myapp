const { pool } = require('../config/db');
async function all() {
  const { rows } = await pool.query('SELECT * FROM brands WHERE is_active=true ORDER BY name');
  return rows;
}
module.exports = { all };
