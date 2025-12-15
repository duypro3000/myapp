const { pool } = require('../config/db');
const { hashPassword } = require('../utils/passwords');
// 🚀 ĐÃ THÊM: Import hàm phân trang
const { getPagination } = require('../utils/pagination');

// ============================================
// 👤 PUBLIC FUNCTIONS (Cho Đăng nhập/Đăng ký)
// ============================================

async function findByEmail(email) {
  const { rows } = await pool.query(
    'SELECT id, email, username, full_name, role, password_hash FROM users WHERE email=$1',
    [email]
  );
  return rows[0];
}

async function findByUsername(username) {
  const { rows } = await pool.query(
    'SELECT id, email, username, full_name, role, password_hash FROM users WHERE username=$1',
    [username]
  );
  return rows[0];
}

async function createUser({ email, username, password, full_name, phone }) {
  const password_hash = await hashPassword(password);
  const { rows } = await pool.query(
    `
    INSERT INTO users (email, username, password_hash, full_name, phone, role, is_active)
    VALUES ($1, $2, $3, $4, $5, 'customer', TRUE)
    RETURNING id, email, username, full_name, role
    `,
    [email, username, password_hash, full_name || username, phone || null]
  );
  return rows[0];
}

async function updateProfile(userId, data) {
  const fields = ['full_name', 'phone', 'dob', 'gender'];
  const updates = [];
  const values = [];

  fields.forEach((f) => {
    if (data[f] !== undefined) {
      let value = data[f];
      // Chuyển chuỗi rỗng thành NULL để tránh lỗi kiểu dữ liệu (đặc biệt cho ngày sinh)
      if (typeof value === 'string' && value.trim() === '') value = null;
      updates.push(`${f}=$${values.length + 1}`);
      values.push(value);
    }
  });

  if (!updates.length) return;
  values.push(userId);
  await pool.query(
    `UPDATE users SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${values.length}`,
    values
  );
}

// ============================================
// 🔑 PASSWORD RESET FUNCTIONS (Giữ nguyên)
// ============================================

async function setResetToken(email, tokenHash, expiresAt) {
  await pool.query(
    'UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE email=$3',
    [tokenHash, expiresAt, email]
  );
}

async function findByResetToken(tokenHash) {
  const { rows } = await pool.query(
    `SELECT id, email FROM users 
     WHERE reset_token=$1 AND reset_token_expires > NOW()`,
    [tokenHash]
  );
  return rows[0];
}

async function updatePassword(id, newPassword) {
  const password_hash = await hashPassword(newPassword);
  await pool.query(
    `UPDATE users 
     SET password_hash=$1, reset_token=NULL, reset_token_expires=NULL, updated_at=NOW() 
     WHERE id=$2`,
    [password_hash, id]
  );
}

async function clearResetToken(id) {
  await pool.query(
    'UPDATE users SET reset_token=NULL, reset_token_expires=NULL WHERE id=$1',
    [id]
  );
}

// ============================================
// 🚀 ADMIN CRUD FUNCTIONS (ĐÃ THÊM MỚI)
// ============================================

/**
 * ADMIN 1: Lấy 1 user (cho form sửa)
 * (Khác với findById của public, hàm này lấy cả user không active)
 */
async function findById(id) {
  const { rows } = await pool.query(
    'SELECT id, email, username, full_name, role, is_active, dob, gender, phone, created_at FROM users WHERE id=$1',
    [id]
  );
  return rows[0];
}

/**
 * ADMIN 2: Lấy tất cả user (cho bảng admin, có tìm kiếm & phân trang)
 */
async function listAll(query = {}) {
  const { page, limit, offset } = getPagination(query.page, 20);
  const params = [];
  const where = [];

  if (query.q) {
    params.push(`%${query.q}%`);
    where.push(`(email ILIKE $${params.length} OR username ILIKE $${params.length} OR full_name ILIKE $${params.length})`);
  }
  if (query.role) {
    params.push(query.role);
    where.push(`role = $${params.length}`);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const countRes = await pool.query(`SELECT COUNT(*) FROM users ${whereSql}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const { rows } = await pool.query(
    `SELECT id, email, username, full_name, role, is_active, created_at 
     FROM users 
     ${whereSql} 
     ORDER BY created_at DESC 
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  const pages = Math.max(1, Math.ceil(total / limit));
  return { items: rows, total, page, pages };
}

/**
 * ADMIN 3: Cập nhật user (do Admin thực hiện)
 * (Khác với updateProfile, hàm này cho phép đổi role và is_active)
 */
async function updateUser(id, data) {
  const fields = ['full_name', 'phone', 'dob', 'gender', 'role', 'is_active'];
  const updates = [];
  const values = [];

  fields.forEach((f) => {
    if (data[f] !== undefined) {
      let value = data[f];
      if (f === 'is_active') {
        value = (value === 'true' || value === true || value === 'on');
      }
      updates.push(`${f} = $${values.length + 1}`);
      values.push(value);
    }
  });

  if (updates.length === 0) return findById(id);

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() 
     WHERE id = $${values.length}
     RETURNING *`,
    values
  );
  return rows[0];
}


// Xuất tất cả hàm
module.exports = {
  // Public
  findByEmail,
  findByUsername,
  createUser,
  updateProfile,
  // Password
  setResetToken,
  findByResetToken,
  updatePassword,
  clearResetToken,
  // 🚀 Admin
  findById,
  listAll,
  updateUser,
};