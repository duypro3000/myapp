const { pool } = require('../config/db');

/**
 * 1. Lấy tất cả địa chỉ của user (Trang /account/addresses)
 * (Giữ nguyên - code đã tốt)
 */
async function listByUser(userId) {
  const { rows } = await pool.query('SELECT * FROM addresses WHERE user_id=$1 ORDER BY is_default DESC, created_at DESC', [userId]);
  return rows;
}

/**
 * 2. 🚀 ĐÃ THÊM: Lấy 1 địa chỉ theo ID (Dùng cho form Sửa)
 * (Thêm 'userId' để đảm bảo user chỉ lấy được địa chỉ của chính họ)
 */
async function findById(addressId, userId) {
  const { rows } = await pool.query(
    'SELECT * FROM addresses WHERE id=$1 AND user_id=$2', 
    [addressId, userId]
  );
  return rows[0];
}

/**
 * 3. Thêm địa chỉ mới
 * (Giữ nguyên - code đã tốt)
 */
async function addAddress(userId, addr) {
  const { rows } = await pool.query(
    `INSERT INTO addresses (user_id, label, full_name, phone, address_line1, address_line2, ward, district, city, province, postal_code, is_default)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [userId, addr.label, addr.full_name, addr.phone, addr.address_line1, addr.address_line2 || null,
     addr.ward || null, addr.district || null, addr.city || null, addr.province || null, addr.postal_code || null, !!addr.is_default]
  );
  // Nếu địa chỉ mới được set là default, reset các địa chỉ cũ
  if (rows[0] && rows[0].is_default) {
    await setDefault(userId, rows[0].id);
  }
  return rows[0];
}

/**
 * 4. 🚀 ĐÃ THÊM: Cập nhật địa chỉ
 */
async function updateAddress(addressId, userId, addr) {
  // Danh sách các trường được phép cập nhật
  const fields = ['label', 'full_name', 'phone', 'address_line1', 'address_line2', 'ward', 'district', 'city', 'province', 'postal_code'];
  const updates = [];
  const values = [];

  fields.forEach(f => {
    if (addr[f] !== undefined) {
      updates.push(`${f}=$${values.length + 1}`);
      values.push(addr[f]);
    }
  });

  if (updates.length === 0) return findById(addressId, userId); // Không có gì thay đổi

  values.push(addressId);
  values.push(userId); // Luôn kiểm tra userId để bảo mật

  const { rows } = await pool.query(
    `UPDATE addresses 
     SET ${updates.join(', ')}, updated_at=NOW() 
     WHERE id=$${values.length - 1} AND user_id=$${values.length}
     RETURNING *`, 
    values
  );
  return rows[0];
}

/**
 * 5. 🚀 ĐÃ THÊM: Xóa địa chỉ
 */
async function deleteAddress(addressId, userId) {
  // Đảm bảo user chỉ xóa được địa chỉ của chính họ
  const { rowCount } = await pool.query(
    'DELETE FROM addresses WHERE id=$1 AND user_id=$2', 
    [addressId, userId]
  );
  return rowCount; // Trả về 1 nếu xóa thành công, 0 nếu thất bại
}


/**
 * 6. Set một địa chỉ làm mặc định
 * (Giữ nguyên - code đã tốt)
 */
async function setDefault(userId, addressId) {
  // Dùng transaction (giao dịch) để đảm bảo cả 2 lệnh cùng thành công
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Bước 1: Xóa tất cả default cũ
    await client.query('UPDATE addresses SET is_default=false WHERE user_id=$1', [userId]);
    // Bước 2: Set default mới
    await client.query('UPDATE addresses SET is_default=true WHERE id=$1 AND user_id=$2', [addressId, userId]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { 
  listByUser, 
  addAddress, 
  setDefault,
  findById,        
  updateAddress,    
  deleteAddress     
};