// Script thêm ảnh mẫu vào bảng product_images
require('dotenv').config();
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Lấy tất cả sản phẩm
    const products = await pool.query('SELECT id, name, slug, cover_image_url FROM products');
    
    if (products.rows.length === 0) {
      console.log('⚠️  Chưa có sản phẩm nào!');
      return;
    }

    console.log(`📦 Tìm thấy ${products.rows.length} sản phẩm\n`);

    for (const product of products.rows) {
      // Kiểm tra xem đã có ảnh trong product_images chưa
      const existingImages = await pool.query(
        'SELECT COUNT(*) FROM product_images WHERE product_id = $1',
        [product.id]
      );

      if (parseInt(existingImages.rows[0].count) === 0) {
        // Nếu chưa có ảnh, thêm ảnh placeholder
        const imageUrl = product.cover_image_url && !product.cover_image_url.includes('google.com/aclk')
          ? product.cover_image_url 
          : 'https://via.placeholder.com/800x600?text=' + encodeURIComponent(product.name);
        
        await pool.query(
          `INSERT INTO product_images (product_id, url, alt, sort_order) 
           VALUES ($1, $2, $3, $4)`,
          [
            product.id,
            imageUrl,
            product.name,
            1
          ]
        );
        console.log(`✔ Đã thêm ảnh cho: ${product.name}`);
      } else {
        console.log(`⏭️  ${product.name} đã có ảnh`);
      }

      // Cập nhật cover_image_url nếu là link Google ads (chứa 'google.com/aclk')
      if (product.cover_image_url && product.cover_image_url.includes('google.com/aclk')) {
        const newImageUrl = 'https://via.placeholder.com/800x600?text=' + encodeURIComponent(product.name);
        await pool.query(
          'UPDATE products SET cover_image_url = $1 WHERE id = $2',
          [newImageUrl, product.id]
        );
        console.log(`  ↳ Đã cập nhật cover_image_url cho: ${product.name}`);
      }
    }

    console.log('\n✅ Hoàn tất!');
    
    // Hiển thị kết quả
    const imageCount = await pool.query('SELECT COUNT(*) FROM product_images');
    console.log(`\n🖼️  Tổng số ảnh: ${imageCount.rows[0].count}`);

  } catch (e) {
    console.error('❌ Lỗi:', e.message);
  } finally {
    await pool.end();
  }
})();

