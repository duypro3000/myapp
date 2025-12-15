const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
// 🚀 ĐÃ THÊM: Import hàm phân trang
const { getPagination } = require('../utils/pagination');

async function createOrder({ userId, cartId, shipping, payment, items }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderNumber = 'TS' + Date.now().toString().slice(-8);
    const subtotal = items.reduce((s, it) => s + (Number(it.price_at) * it.quantity), 0);
    const shipping_fee = Number(shipping.fee || 0);
    const discount_total = Number(payment.discount || 0);
    const grand_total = subtotal + shipping_fee - discount_total;

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (order_number, user_id, cart_id, status, payment_method, payment_status,
                            shipping_method, shipping_fee, subtotal, discount_total, grand_total,
                            shipping_address, billing_address)
       VALUES ($1,$2,$3,'new',$4,'unpaid',$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
       [orderNumber, userId || null, cartId, payment.method, shipping.method, shipping_fee, subtotal, discount_total, grand_total,
       JSON.stringify(shipping.address), JSON.stringify(shipping.address)]
    );
    const order = orderRows[0];

    for (const it of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, quantity, unit_price, total_price)
         VALUES ($1,$2,$3,$4,$5,$6)`,
         [order.id, it.product_id, it.variant_id, it.quantity, it.price_at, it.price_at * it.quantity]
      );
      if (it.variant_id) {
        await client.query('UPDATE variants SET stock = stock - $1 WHERE id=$2', [it.quantity, it.variant_id]);
      }
      // 🚀 NÂNG CẤP NHỎ: Thêm giảm stock cho sản phẩm (nếu không có variant)
      else if (it.product_id) {
         await client.query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id=$2', [it.quantity, it.product_id]);
      }
    }
    await client.query('COMMIT');
    return order;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}


async function listByUser(userId) {
  const { rows } = await pool.query('SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC', [userId]);
  return rows;
}


async function findByNumber(orderNumber, userId = null) {
  if (userId) {
    const { rows } = await pool.query('SELECT * FROM orders WHERE order_number=$1 AND user_id=$2', [orderNumber, userId]);
    return rows[0];
  } else {
    const { rows } = await pool.query('SELECT * FROM orders WHERE order_number=$1', [orderNumber]);
    return rows[0];
  }
}


async function listAll(query = {}) {
  const { page, limit, offset } = getPagination(query.page, 20); // 20 đơn/trang
  const params = [];
  const where = [];
  
  // 🚀 NÂNG CẤP: JOIN với bảng users để tìm kiếm
  const joins = ['LEFT JOIN users u ON u.id = o.user_id'];

  // Hỗ trợ tìm kiếm theo Mã đơn, Email, Tên
  if (query.q) {
    params.push(`%${query.q}%`);
    const qClause = `(o.order_number ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`;
    where.push(qClause);
  }
  
  // Hỗ trợ lọc theo trạng thái
  if (query.status) {
    params.push(query.status);
    where.push(`o.status = $${params.length}`);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const joinSql = joins.join(' ');

  // Đếm tổng số
  const countRes = await pool.query(`SELECT COUNT(o.id) FROM orders o ${joinSql} ${whereSql}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  // Lấy dữ liệu
  const { rows } = await pool.query(
    `SELECT o.*, u.full_name as customer_name, u.email as customer_email
     FROM orders o
     ${joinSql}
     ${whereSql}
     ORDER BY o.created_at DESC 
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  const pages = Math.max(1, Math.ceil(total / limit));
  return { items: rows, total, page, pages };
}


async function findDetailsById(orderId) {
  // 1. Lấy thông tin đơn hàng VÀ thông tin user
  const orderRes = await pool.query(
    `SELECT o.*, u.full_name as customer_name, u.email as customer_email, u.phone as customer_phone
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     WHERE o.id = $1`,
    [orderId]
  );

  if (!orderRes.rows[0]) return null;
  const order = orderRes.rows[0];

  // 2. Lấy danh sách sản phẩm (items) trong đơn hàng
  const itemsRes = await pool.query(
    `SELECT oi.*, p.name as product_name, p.slug as product_slug, p.cover_image_url
     FROM order_items oi
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1
     ORDER BY oi.id ASC`,
    [orderId]
  );

  order.items = itemsRes.rows; 
  return order;
}

async function updateStatus(orderId, status) {
  await pool.query('UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2', [status, orderId]);
}

module.exports = {
  createOrder,
  listByUser,
  findByNumber,
  listAll, 
  updateStatus,
  findDetailsById, 
};