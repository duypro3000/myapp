const { pool } = require('../config/db');

async function getOrCreateCart({ userId, sessionId }) {
  let cart;
  if (userId) {
    const res = await pool.query('SELECT * FROM carts WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1', [userId]);
    cart = res.rows[0];
    if (!cart) {
      const ins = await pool.query('INSERT INTO carts (user_id, session_id) VALUES ($1,$2) RETURNING *', [userId, sessionId || null]);
      cart = ins.rows[0];
    }
  } else {
    const res = await pool.query('SELECT * FROM carts WHERE session_id=$1 ORDER BY created_at DESC LIMIT 1', [sessionId]);
    cart = res.rows[0];
    if (!cart) {
      const ins = await pool.query('INSERT INTO carts (session_id) VALUES ($1) RETURNING *', [sessionId]);
      cart = ins.rows[0];
    }
  }
  return cart;
}

async function getItems(cartId) {
  const { rows } = await pool.query(
    `SELECT ci.*, p.name AS product_name, p.slug as product_slug, v.variant_name
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     LEFT JOIN variants v ON v.id = ci.variant_id
     WHERE ci.cart_id=$1 ORDER BY ci.created_at DESC`, [cartId]
  );
  return rows;
}

async function addItem(cartId, productId, variantId, price, quantity) {
  const { rows } = await pool.query(
    `INSERT INTO cart_items (cart_id, product_id, variant_id, price_at, quantity)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
     [cartId, productId, variantId || null, price, quantity]
  );
  return rows[0];
}

async function updateQty(itemId, qty) {
  await pool.query('UPDATE cart_items SET quantity=$1 WHERE id=$2', [qty, itemId]);
}

async function removeItem(itemId) {
  await pool.query('DELETE FROM cart_items WHERE id=$1', [itemId]);
}

module.exports = { getOrCreateCart, getItems, addItem, updateQty, removeItem };
