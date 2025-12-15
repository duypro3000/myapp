const express = require('express');
const router = express.Router();
const productModel = require('../models/productModel');
const categoryModel = require('../models/categoryModel');
const reviewModel = require('../models/reviewModel');

// 🚀 ĐÃ THÊM: Import middleware để bảo vệ route "gửi đánh giá"
const { ensureAuthenticated } = require('../middleware/auth');

/**
 * GET /c/:slug
 * Trang danh sách sản phẩm theo danh mục (Giữ nguyên, đã tốt)
 */
router.get('/c/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { items, total, page, pages } = await productModel.listByCategorySlug(slug, req.query);
    res.render('pages/category', { title: 'Danh mục', items, total, page, pages, slug, query: req.query });
  } catch (e) { next(e); }
});

/**
 * GET /p/:slug
 * Trang chi tiết sản phẩm (🚀 ĐÃ NÂNG CẤP)
 */
router.get('/p/:slug', async (req, res, next) => {
  try {
    // 1. Lấy sản phẩm
    const product = await productModel.findBySlug(req.params.slug);
    if (!product) {
      return res.status(404).render('pages/static', { title: 'Không tìm thấy', content: '<p>Sản phẩm không tồn tại.</p>' });
    }

    // 2. 🚀 NÂNG CẤP (Bảo vệ lỗi): Tải review một cách an toàn
    let reviews = [];
    try {
      // (Hàm này có thể cần tạo/nâng cấp trong reviewModel.js)
      reviews = await reviewModel.listByProduct(product.id, 10);
    } catch (reviewError) {
      console.error("Lỗi khi tải review:", reviewError);
      // Không làm sập trang, chỉ báo lỗi và tiếp tục với mảng review rỗng
    }
    
    // 3. 🚀 NÂNG CẤP (Thêm tính năng): Tải sản phẩm liên quan
    let related = [];
    try {
      // (Giả sử product.category_id tồn tại và categoryModel có findById)
      const category = await categoryModel.findById(product.category_id);
      if (category) {
        // Tải 4 sản phẩm cùng danh mục
        const relatedData = await productModel.listByCategorySlug(category.slug, { limit: 4 });
        // Lọc bỏ sản phẩm đang xem khỏi danh sách liên quan
        related = relatedData.items.filter(p => p.id !== product.id);
      }
    } catch (relatedError) {
      console.error("Lỗi khi tải sản phẩm liên quan:", relatedError);
    }

    // 4. Render trang
    res.render('pages/product', { 
      title: product.name, 
      product, 
      reviews,
      related // 🚀 Đã thêm
    });

  } catch (e) { next(e); }
});

/**
 * POST /p/:slug/review
 * 🚀 TÍNH NĂNG MỚI: Xử lý gửi đánh giá
 */
router.post('/p/:slug/review', ensureAuthenticated, async (req, res, next) => {
  try {
    const product = await productModel.findBySlug(req.params.slug);
    if (!product) {
      return res.status(404).send('Sản phẩm không tồn tại.');
    }

    const { rating, comment } = req.body;
    const userId = req.session.user.id;

    // (Hàm này cần được tạo trong reviewModel.js)
    await reviewModel.createReview({
      user_id: userId,
      product_id: product.id,
      rating: parseInt(rating, 10),
      comment: comment
    });

    req.flash('success', 'Cảm ơn bạn đã đánh giá sản phẩm!');
    res.redirect('/p/' + product.slug);

  } catch (e) {
    req.flash('error', 'Gửi đánh giá thất bại. Vui lòng thử lại.');
    res.redirect('/p/' + req.params.slug);
  }
});

module.exports = router;