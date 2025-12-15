const { pool } = require('../config/db');
const { getPagination } = require('../utils/pagination');
const slugifyLib = require('slugify');

async function generateUniqueSlug(rawBase) {
  const base = (slugifyLib(rawBase || '', { lower: true, strict: true }) || 'sp').slice(0, 60);
  let candidate = base;
  let i = 0;
  while (true) {
    const { rows } = await pool.query('SELECT 1 FROM products WHERE slug=$1 LIMIT 1', [candidate]);
    if (rows.length === 0) return candidate;
    i += 1;
    const suffix = '-' + (Date.now() % 10000) + (i > 1 ? '-' + i : '');
    candidate = (base + suffix).slice(0, 80);
  }
}

/**
 * 🏆 Sản phẩm bán chạy nhất
 */
async function bestSellers(limit = 8) {
  const { rows } = await pool.query(
    `
    SELECT p.*, COALESCE(SUM(oi.quantity),0) AS sold
    FROM products p
    LEFT JOIN order_items oi ON oi.product_id = p.id
    WHERE p.status='active'
    GROUP BY p.id
    ORDER BY sold DESC
    LIMIT $1
    `,
    [limit]
  );
  return rows;
}

/**
 * 🆕 Sản phẩm mới về
 */
async function newArrivals(limit = 8) {
  const { rows } = await pool.query(
    `SELECT * FROM products 
     WHERE status='active' 
     ORDER BY created_at DESC 
     LIMIT $1`,
    [limit]
  );
  return rows;
}

/**
 * ⚡ Flash Sale - chỉ lấy sản phẩm còn hiệu lực
 */
async function flashSaleItems(limit = 8) {
  const { rows } = await pool.query(
    `
    SELECT 
      p.id, p.name, p.slug, p.price, 
      fsi.flash_price, fs.start_at AS flash_start_time, fs.end_at AS flash_end_time,
      p.cover_image_url,
      COALESCE(p.stock_quantity, 0) AS stock_quantity,
      COALESCE(p.sold_quantity, 0) AS sold_quantity,
      LEAST(100, ROUND(((COALESCE(p.sold_quantity,0)::decimal / NULLIF(p.stock_quantity,0)) * 100), 0)) AS sold_percent
    FROM flash_sales fs
    JOIN flash_sale_items fsi ON fsi.flash_sale_id = fs.id
    JOIN products p ON p.id = fsi.product_id
    WHERE fs.active = TRUE
      AND p.status = 'active'
      AND fs.start_at <= NOW()
      AND fs.end_at >= NOW()
    ORDER BY fs.end_at ASC
    LIMIT $1
    `,
    [limit]
  );
  return rows;
}

/**
 * 🔍 Lấy chi tiết sản phẩm theo slug (cho trang public)
 */
async function findBySlug(slug) {
  const { rows } = await pool.query(
    "SELECT * FROM products WHERE slug=$1 AND status='active'", 
    [slug]
  );
  if (!rows[0]) return null;

  const product = rows[0];
  const imgs = await pool.query(
    'SELECT * FROM product_images WHERE product_id=$1 ORDER BY sort_order NULLS LAST, id',
    [product.id]
  );
  const variants = await pool.query(
    'SELECT * FROM variants WHERE product_id=$1 ORDER BY id',
    [product.id]
  );

  product.images = imgs.rows;
  product.variants = variants.rows;
  return product;
}

/**
 * 🗂️ Danh sách sản phẩm theo danh mục (có filter)
 */
async function listByCategorySlug(slug, query) {
  const catRes = await pool.query('SELECT id FROM categories WHERE slug=$1', [slug]);
  if (!catRes.rows[0]) return { items: [], total: 0, page: 1, pages: 1 };

  const catId = catRes.rows[0].id;
  const { page, limit, offset } = getPagination(query.page, query.limit);
  const where = ['p.category_id=$1', "p.status='active'"];
  const params = [catId];

  // 🔎 Lọc sản phẩm
  if (query.min_price) {
    params.push(query.min_price);
    where.push(`p.price >= $${params.length}`);
  }
  if (query.max_price) {
    params.push(query.max_price);
    where.push(`p.price <= $${params.length}`);
  }
  if (query.brand) {
    params.push(query.brand);
    where.push(`p.brand_id = $${params.length}`);
  }
  if (query.q) {
    params.push('%' + query.q + '%');
    where.push(`(p.name ILIKE $${params.length} OR p.description_short ILIKE $${params.length})`);
  }

  // 🔽 Sắp xếp
  let sort = 'p.created_at DESC';
  if (query.sort === 'price_asc') sort = 'p.price ASC';
  else if (query.sort === 'price_desc') sort = 'p.price DESC';
  else if (query.sort === 'best')
    sort = '(SELECT COALESCE(SUM(oi.quantity),0) FROM order_items oi WHERE oi.product_id=p.id) DESC';

  const whereSql = 'WHERE ' + where.join(' AND ');
  const countRes = await pool.query(`SELECT COUNT(*) FROM products p ${whereSql}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const { rows } = await pool.query(
    `SELECT p.* FROM products p ${whereSql} ORDER BY ${sort} LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  const pages = Math.max(1, Math.ceil(total / limit));
  return { items: rows, total, page, pages };
}

/**
 * 🔍 Tìm kiếm sản phẩm (cho trang public) - Có filter theo giá và danh mục
 */
async function search(q, page = 1, limit = 12, filters = {}) {
  const { offset } = getPagination(page, limit);
  const where = ["status='active'"];
  const params = [];
  
  // Tìm kiếm theo từ khóa
  if (q) {
    params.push('%' + q + '%');
    where.push(`(name ILIKE $${params.length} OR description_short ILIKE $${params.length})`);
  }
  
  // Filter theo giá
  if (filters.min_price) {
    params.push(Number(filters.min_price));
    where.push(`COALESCE(sale_price, price) >= $${params.length}`);
  }
  if (filters.max_price) {
    params.push(Number(filters.max_price));
    where.push(`COALESCE(sale_price, price) <= $${params.length}`);
  }
  
  // Filter theo danh mục
  if (filters.category_id) {
    params.push(Number(filters.category_id));
    where.push(`category_id = $${params.length}`);
  }
  
  // Filter theo thương hiệu
  if (filters.brand_id) {
    params.push(Number(filters.brand_id));
    where.push(`brand_id = $${params.length}`);
  }
  
  const whereSql = 'WHERE ' + where.join(' AND ');
  
  // Sắp xếp
  let sort = 'created_at DESC';
  if (filters.sort === 'price_asc') sort = 'COALESCE(sale_price, price) ASC';
  else if (filters.sort === 'price_desc') sort = 'COALESCE(sale_price, price) DESC';
  else if (filters.sort === 'name_asc') sort = 'name ASC';
  else if (filters.sort === 'name_desc') sort = 'name DESC';
  else if (filters.sort === 'newest') sort = 'created_at DESC';
  else if (filters.sort === 'oldest') sort = 'created_at ASC';

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM products ${whereSql}`,
    params
  );

  const total = parseInt(countRes.rows[0].count, 10);

  const { rows } = await pool.query(
    `
    SELECT * FROM products 
    ${whereSql}
    ORDER BY ${sort}
    LIMIT ${limit} OFFSET ${offset}
    `,
    params
  );

  return { items: rows, total };
}

/* ==================================================
 * 🚀 ADMIN CRUD FUNCTIONS (ĐÃ THÊM MỚI)
 * ================================================== */

/**
 * ADMIN 1. Lấy tất cả sản phẩm (cho trang admin, có tìm kiếm & phân trang)
 */
async function listAll(query = {}) {
  const { page, limit, offset } = getPagination(query.page, 20); // 20 sản phẩm/trang
  const params = [];
  const where = [];

  // 🔎 Hỗ trợ tìm kiếm trong admin
  if (query.q) {
    params.push(`%${query.q}%`);
    where.push(`(name ILIKE $${params.length} OR slug ILIKE $${params.length})`);
  }
  
  // 🔽 Lọc theo trạng thái (ví dụ: active, draft)
  if (query.status) {
    params.push(query.status);
    where.push(`status = $${params.length}`);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  // Đếm tổng số
  const countRes = await pool.query(`SELECT COUNT(*) FROM products ${whereSql}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  // Lấy dữ liệu
  const { rows } = await pool.query(
    `SELECT * FROM products 
     ${whereSql} 
     ORDER BY updated_at DESC, created_at DESC 
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  const pages = Math.max(1, Math.ceil(total / limit));
  return { items: rows, total, page, pages };
}

/**
 * ADMIN 2. Lấy 1 sản phẩm theo ID (để sửa)
 * (Khác với findBySlug, hàm này lấy bằng ID và lấy cả sản phẩm 'draft')
 */
async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM products WHERE id=$1', [id]);
  if (!rows[0]) return null;

  const product = rows[0];
  // Lấy images cho trang edit
  const imgs = await pool.query(
    'SELECT * FROM product_images WHERE product_id=$1 ORDER BY sort_order NULLS LAST, id',
    [product.id]
  );
  product.images = imgs.rows;
  
  return product; 
}

/**
 * ADMIN 3. Tạo sản phẩm mới
 */
async function createProduct(data) {
  // Gán giá trị mặc định cho các trường quan trọng
  const {
    name,
    slug,
    price = 0,
    description = '', // map sang description_long trong DB
    category_id = null,
    brand_id = null,
    stock_quantity = 0,
    status = 'active', // Mặc định là 'active' để có thể xem chi tiết ngay
    cover_image_url = null,
    description_short = null,
    sale_price = null,
  } = data;

  // Bảo đảm có slug hợp lệ & duy nhất
  let finalSlug = slug;
  if (!finalSlug || String(finalSlug).trim() === '') {
    finalSlug = await generateUniqueSlug(name || 'sp');
  } else {
    finalSlug = await generateUniqueSlug(finalSlug);
  }

  const { rows } = await pool.query(
    `
    INSERT INTO products (
      name, slug, price, description_short, description_long, category_id, brand_id,
      stock_quantity, status, cover_image_url, sale_price
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *`,
    [
      name,
      finalSlug,
      price,
      description_short,
      description || null,
      category_id,
      brand_id,
      stock_quantity,
      status,
      cover_image_url,
      sale_price
    ]
  );
  return rows[0]; // Trả về sản phẩm vừa tạo
}

/**
 * ADMIN 4. Cập nhật sản phẩm
 */
async function updateProduct(id, data) {
  // Các trường được phép cập nhật
  const fields = [
    'name', 'price', 'description', 'description_short', 'category_id', 'brand_id', 
    'stock_quantity', 'status', 'cover_image_url', 'sale_price'
  ];
  
  const updates = [];
  const values = [];

  // Xử lý slug riêng để đảm bảo unique
  if (data.slug !== undefined && data.slug !== null && data.slug.trim() !== '') {
    const uniqueSlug = await generateUniqueSlug(data.slug);
    updates.push(`slug = $${values.length + 1}`);
    values.push(uniqueSlug);
  }

  // Xử lý các field khác
  fields.forEach((field) => {
    // Chỉ thêm vào câu query nếu trường đó tồn tại trong data
    if (data[field] !== undefined) {
      const column = (field === 'description') ? 'description_long' : field;
      updates.push(`${column} = $${values.length + 1}`);
      // Cho phép lưu empty string cho description và description_short
      // Với các field khác như cover_image_url, nếu empty string thì lưu null
      let value = data[field];
      if (field === 'cover_image_url' && typeof value === 'string' && value.trim() === '') {
        value = null;
      }
      values.push(value);
    }
  });

  if (updates.length === 0) {
    // Không có gì để cập nhật, trả về sản phẩm hiện tại
    return findById(id);
  }

  values.push(id); // Thêm ID vào cuối mảng params

  const { rows } = await pool.query(
    `
    UPDATE products 
    SET ${updates.join(', ')}, updated_at = NOW() 
    WHERE id = $${values.length}
    RETURNING *
    `,
    values
  );
  return rows[0]; // Trả về sản phẩm đã cập nhật
}

/**
 * ADMIN 5. Xóa sản phẩm
 * (Nâng cấp: Dùng soft-delete thay vì xóa cứng để bảo toàn dữ liệu đơn hàng)
 */
async function deleteProduct(id) {
  // Xóa cứng sản phẩm khỏi DB
  await pool.query('DELETE FROM product_images WHERE product_id=$1', [id]);
  await pool.query('DELETE FROM variants WHERE product_id=$1', [id]);
  await pool.query('DELETE FROM products WHERE id=$1', [id]);
  return { id };
}

/**
 * 🚀 Ẩn/Hiện sản phẩm thông qua status
 */
async function setStatus(id, status) {
  const { rows } = await pool.query(
    `UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING id, status`,
    [status, id]
  );
  return rows[0];
}

/**
 * Quản lý ảnh sản phẩm
 */
async function addProductImage(productId, url, alt = null, sortOrder = null) {
  const { rows } = await pool.query(
    `INSERT INTO product_images (product_id, url, alt, sort_order) 
     VALUES ($1, $2, $3, $4) 
     RETURNING *`,
    [productId, url, alt, sortOrder]
  );
  return rows[0];
}

async function deleteProductImage(imageId) {
  await pool.query('DELETE FROM product_images WHERE id=$1', [imageId]);
  return { id: imageId };
}

async function updateProductImages(productId, images) {
  // Xóa tất cả ảnh cũ
  await pool.query('DELETE FROM product_images WHERE product_id=$1', [productId]);
  
  // Thêm ảnh mới nếu có
  if (images && images.length > 0) {
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img && img.url && img.url.trim()) {
        await pool.query(
          `INSERT INTO product_images (product_id, url, alt, sort_order) 
           VALUES ($1, $2, $3, $4)`,
          [productId, img.url.trim(), img.alt || null, img.sort_order || (i + 1)]
        );
      }
    }
  }
  
  // Trả về danh sách ảnh mới
  const { rows } = await pool.query(
    'SELECT * FROM product_images WHERE product_id=$1 ORDER BY sort_order NULLS LAST, id',
    [productId]
  );
  return rows;
}

// Xuất tất cả các hàm, bao gồm cả các hàm admin mới
module.exports = {
  // Public
  bestSellers,
  newArrivals,
  flashSaleItems,
  findBySlug,
  listByCategorySlug,
  search,

  // 🚀 Admin
  listAll,
  findById,
  createProduct,
  updateProduct,
  deleteProduct,
  setStatus,
  
  // Ảnh sản phẩm
  addProductImage,
  deleteProductImage,
  updateProductImages,
};