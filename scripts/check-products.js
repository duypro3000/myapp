// Script kiểm tra và tạo lại bảng products và product_images nếu cần
require('dotenv').config();
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // 1. Kiểm tra và tạo bảng products nếu chưa có
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        sku TEXT UNIQUE,
        brand_id INTEGER REFERENCES brands(id),
        category_id INTEGER REFERENCES categories(id),
        description_short TEXT,
        description_long TEXT,
        warranty_policy TEXT,
        return_policy TEXT,
        specs JSONB,
        cover_image_url TEXT,
        price NUMERIC(12,0) NOT NULL,
        sale_price NUMERIC(12,0),
        status TEXT NOT NULL DEFAULT 'active',
        stock_quantity INTEGER DEFAULT 0,
        sold_quantity INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✔ Bảng products đã sẵn sàng');

    // 2. Kiểm tra và tạo bảng product_images nếu chưa có
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        alt TEXT,
        sort_order INTEGER
      )
    `);
    console.log('✔ Bảng product_images đã sẵn sàng');

    // 3. Kiểm tra số lượng sản phẩm
    const productCount = await pool.query('SELECT COUNT(*) FROM products');
    console.log(`📦 Số sản phẩm trong database: ${productCount.rows[0].count}`);

    // 4. Kiểm tra số lượng ảnh
    const imageCount = await pool.query('SELECT COUNT(*) FROM product_images');
    console.log(`🖼️  Số ảnh trong database: ${imageCount.rows[0].count}`);

    // 5. Hiển thị một vài sản phẩm mẫu
    const sampleProducts = await pool.query('SELECT id, name, slug, cover_image_url FROM products LIMIT 5');
    if (sampleProducts.rows.length > 0) {
      console.log('\n📋 Một số sản phẩm:');
      sampleProducts.rows.forEach(p => {
        console.log(`  - ${p.name} (slug: ${p.slug}) - Ảnh: ${p.cover_image_url || 'CHƯA CÓ'}`);
      });
    } else {
      console.log('\n⚠️  Chưa có sản phẩm nào trong database!');
      console.log('   Chạy: npm run db:seed để thêm dữ liệu mẫu');
    }

  } catch (e) {
    console.error('❌ Lỗi:', e.message);
  } finally {
    await pool.end();
  }
})();

