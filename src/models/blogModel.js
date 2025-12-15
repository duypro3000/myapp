const { pool } = require('../config/db');
async function listPosts(limit = 6) {
  const { rows } = await pool.query("SELECT * FROM blogs WHERE status='published' ORDER BY published_at DESC LIMIT $1", [limit]);
  return rows;
}
async function findBySlug(slug) {
  const { rows } = await pool.query("SELECT * FROM blogs WHERE slug=$1 AND status='published'", [slug]);
  return rows[0];
}
module.exports = { listPosts, findBySlug };
