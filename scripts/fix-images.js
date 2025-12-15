// Script cập nhật cover_image_url cho tất cả sản phẩm
require('dotenv').config();
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const products = await pool.query('SELECT id, name, slug, cover_image_url FROM products');
    
    for (const product of products.rows) {
      // Nếu cover_image_url là link Google ads, thay bằng placeholder
      if (product.cover_image_url && product.cover_image_url.includes('google.com/aclk')) {
        const newUrl = 'https://via.placeholder.com/800x600?text=' + encodeURIComponent(product.name);
        await pool.query(
          'UPDATE products SET cover_image_url = $1 WHERE id = $2',
          [newUrl, product.id]
        );
        console.log(`✔ Đã cập nhật ảnh cho: ${product.name}`);
      }
    }

    console.log('\n✅ Hoàn tất!');
  } catch (e) {
    console.error('❌ Lỗi:', e.message);
  } finally {
    await pool.end();
  }
})();

