const { pool } = require('../config/db');

/**
 * Lấy danh sách review đã được duyệt cho một sản phẩm.
 * (Hàm này đã viết tốt, giữ nguyên)
 */
async function listByProduct(productId, limit = 20) {
  const { rows } = await pool.query(
    `SELECT r.*, u.full_name FROM reviews r
     JOIN users u ON u.id = r.user_id
     WHERE r.product_id=$1 AND r.status='approved'
     ORDER BY r.created_at DESC LIMIT $2`,
     [productId, limit]
  );
  return rows;
}

/**
 * 🚀 NÂNG CẤP: Lấy thống kê (sao trung bình, tổng số) cho sản phẩm
 */
async function getProductReviewStats(productId) {
  const { rows } = await pool.query(
    `SELECT 
       COUNT(*) AS total_reviews,
       COALESCE(AVG(rating), 0) AS average_rating
     FROM reviews
     WHERE product_id = $1 AND status = 'approved'`,
    [productId]
  );
  // Trả về { total_reviews: "5", average_rating: "4.5" }
  return rows[0]; 
}

async function createReview(data) {
  const { product_id, user_id, rating, comment } = data;

  const { rows } = await pool.query(
    `INSERT INTO reviews (product_id, user_id, rating, content, status)
     VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
     // $4 (cột 'content') sẽ nhận giá trị của biến 'comment'
     [product_id, user_id, rating, comment]
  );
  return rows[0];
}

module.exports = {
  listByProduct,
  createReview,
  getProductReviewStats, // 🚀 Đã thêm
};