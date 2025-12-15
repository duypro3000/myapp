const { pool } = require('../config/db');
// 🚀 ĐÃ THÊM: Import hàm phân trang
const { getPagination } = require('../utils/pagination'); 

/**
 * Lấy TẤT CẢ danh mục (cho trang admin, có tìm kiếm & phân trang)
 * 🚀 NÂNG CẤP: Hàm 'listAll' mới cho trang admin
 */
async function listAll(query = {}) {
  const { page, limit, offset } = getPagination(query.page, 20); // 20 mục/trang
  const params = [];
  const where = [];

  // Hỗ trợ tìm kiếm
  if (query.q) {
    params.push(`%${query.q}%`);
    where.push(`(name ILIKE $${params.length} OR slug ILIKE $${params.length})`);
  }
  
  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  // Đếm tổng số
  const countRes = await pool.query(`SELECT COUNT(*) FROM categories ${whereSql}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  // Lấy dữ liệu (Thêm đếm số sản phẩm trong mỗi danh mục)
  const { rows } = await pool.query(
    `
    SELECT c.*, COUNT(p.id) AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    ${whereSql}
    GROUP BY c.id
    ORDER BY c.sort_order NULLS LAST, c.name ASC
    LIMIT ${limit} OFFSET ${offset}
    `,
    params
  );

  const pages = Math.max(1, Math.ceil(total / limit));
  return { items: rows, total, page, pages };
}

/**
 * 🚀 ĐÃ ĐỔI TÊN: 'all' -> 'getAllActive'
 * Lấy các danh mục đang hoạt động (dùng cho trang public, menu...)
 */
async function getAllActive() {
  const { rows } = await pool.query('SELECT * FROM categories WHERE is_active=true ORDER BY sort_order NULLS LAST, name');
  return rows;
}

/**
 * 🚀 ĐÃ THÊM: Hàm findById (dùng cho form Sửa)
 * Lấy 1 danh mục (bất kể trạng thái)
 */
async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM categories WHERE id=$1', [id]);
  return rows[0];
}

/**
 * 🔍 Tìm danh mục theo slug (cho trang public)
 * 🚀 NÂNG CẤP: Chỉ tìm các danh mục 'is_active'
 */
async function findBySlug(slug) {
  const { rows } = await pool.query('SELECT * FROM categories WHERE slug=$1 AND is_active=true', [slug]);
  return rows[0];
}

/**
 * 🆕 Tạo danh mục mới
 * 🚀 ĐÃ ĐỔI TÊN: 'create' -> 'createCategory'
 */
async function createCategory(cat) {
  const { rows } = await pool.query(
    `INSERT INTO categories (name, slug, description, image_url, parent_id, is_active, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [cat.name, cat.slug, cat.description || null, cat.image_url || null, cat.parent_id || null, cat.is_active || false, cat.sort_order || null]
  );
  return rows[0];
}

/**
 * ✏️ Cập nhật danh mục
 * 🚀 ĐÃ ĐỔI TÊN: 'update' -> 'updateCategory'
 */
async function updateCategory(id, cat) {
  const fields = ['name','slug','description','image_url','parent_id','is_active','sort_order'];
  const updates = [];
  const values = [];

  fields.forEach(f => {
    if (cat[f] !== undefined) {
      // 🚀 NÂNG CẤP: Xử lý giá trị boolean (is_active)
      let value = cat[f];
      if (f === 'is_active') {
        value = (value === 'true' || value === true || value === 'on');
      }
      updates.push(`${f}=$${values.length + 1}`);
      values.push(value);
    }
  });

  if (!updates.length) return findById(id); // Không có gì thay đổi, trả về data cũ
  
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE categories SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, 
    values
  );
  return rows[0];
}

/**
 * ❌ Xóa danh mục
 * 🚀 ĐÃ SỬA LỖI: 'remove' -> 'deleteCategory'
 * 🚀 NÂNG CẤP: Chuyển từ Xóa Cứng (DELETE) sang Xóa Mềm (UPDATE)
 */
async function deleteCategory(id) {
  // Thay vì xóa, chúng ta "ẩn" nó đi. 
  // Điều này an toàn cho các sản phẩm cũ vẫn đang thuộc danh mục này.
  await pool.query('UPDATE categories SET is_active=false, updated_at=NOW() WHERE id=$1', [id]);
}

/**
 * 🚀 Ẩn/Hiện danh mục
 */
async function setActive(id, isActive) {
  await pool.query('UPDATE categories SET is_active=$1, updated_at=NOW() WHERE id=$2', [isActive, id]);
}

/**
 * ❗ Xóa cứng danh mục (chỉ cho phép khi không còn sản phẩm thuộc danh mục)
 */
async function hardDeleteCategory(id) {
  // 1) Gỡ liên kết sản phẩm khỏi danh mục này
  await pool.query('UPDATE products SET category_id=NULL, updated_at=NOW() WHERE category_id=$1', [id]);
  // 2) Nếu có danh mục con trỏ về null
  await pool.query('UPDATE categories SET parent_id=NULL, updated_at=NOW() WHERE parent_id=$1', [id]);
  // 3) Xóa danh mục
  await pool.query('DELETE FROM categories WHERE id=$1', [id]);
}

module.exports = {
  // Hàm mới cho Admin
  listAll,
  findById,
  createCategory,
  updateCategory,
  deleteCategory,
  setActive,
  hardDeleteCategory,
  getAllActive, 
  findBySlug,
};