const { pool } = require('../config/db');
async function activeBanners() {
  const { rows } = await pool.query(
    `SELECT * FROM banners WHERE active=true
     AND (start_at IS NULL OR start_at <= NOW()) AND (end_at IS NULL OR end_at >= NOW())
     ORDER BY position, id DESC`
  );
  return rows;
}
module.exports = { activeBanners };
