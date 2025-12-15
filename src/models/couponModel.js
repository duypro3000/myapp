const { pool } = require('../config/db');

async function findActiveByCode(code) {
  const { rows } = await pool.query('SELECT * FROM coupons WHERE active=true AND code=$1 AND start_at<=NOW() AND end_at>=NOW()', [code]);
  return rows[0];
}

module.exports = { findActiveByCode };
