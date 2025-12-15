const { pool } = require('../config/db');

async function listByUser(userId) {
  const { rows } = await pool.query(
    `SELECT w.*, p.name, p.slug, p.price, p.sale_price
     FROM wishlists w
     JOIN products p ON p.id = w.product_id
     WHERE w.user_id=$1 ORDER BY w.created_at DESC`, [userId]
  );
  return rows;
}

async function toggle(userId, productId) {
  const res = await pool.query('SELECT id FROM wishlists WHERE user_id=$1 AND product_id=$2', [userId, productId]);
  if (res.rows[0]) {
    await pool.query('DELETE FROM wishlists WHERE id=$1', [res.rows[0].id]);
    return { liked: false };
  } else {
    await pool.query('INSERT INTO wishlists (user_id, product_id) VALUES ($1,$2)', [userId, productId]);
    return { liked: true };
  }
}

module.exports = { listByUser, toggle };
