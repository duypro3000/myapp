const { pool } = require('../config/db');

async function recommendedForUser(userId, limit = 8) {
  // Simple heuristic: top sold overall
  const { rows } = await pool.query(
    `SELECT p.*, COALESCE(SUM(oi.quantity),0) AS sold
     FROM products p
     LEFT JOIN order_items oi ON oi.product_id = p.id
     WHERE p.status='active'
     GROUP BY p.id
     ORDER BY sold DESC
     LIMIT $1`, [limit]
  );
  return rows;
}
module.exports = { recommendedForUser };
