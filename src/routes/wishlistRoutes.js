const express = require('express');
const router = express.Router();
// 🚀 ĐÃ SỬA: Đổi tên hàm
const { ensureAuthenticated } = require('../middleware/auth');
const wishlistModel = require('../models/wishlistModel');

/**
 * API (POST) Dùng cho JavaScript (nếu có)
 * 🚀 ĐÃ SỬA: Dùng 'ensureAuthenticated'
 */
router.post('/api/wishlist/toggle', ensureAuthenticated, async (req, res, next) => {
  try {
    const { product_id } = req.body;
    const result = await wishlistModel.toggle(req.session.user.id, product_id);
    res.json({ ok: true, ...result });
  } catch (e) { next(e); }
});

/**
 * 🚀 NÂNG CẤP: Thêm route GET (dạng link)
 * Xử lý link "Thêm vào yêu thích" từ trang chi tiết sản phẩm (product.ejs)
 */
router.get('/wishlist/add/:id', ensureAuthenticated, async (req, res, next) => {
  try {
    const productId = req.params.id;
    const userId = req.session.user.id;
    
    // Gọi hàm toggle (nó sẽ tự thêm nếu chưa có, hoặc xóa nếu đã có)
    await wishlistModel.toggle(userId, productId);
    
    req.flash('success', 'Đã cập nhật danh sách yêu thích!');
    
    // Chuyển hướng người dùng quay LẠI trang họ vừa rời đi
    res.redirect('back'); 
    
  } catch (e) { 
    req.flash('error', 'Cập nhật thất bại, vui lòng thử lại.');
    res.redirect('back');
  }
});


module.exports = router;