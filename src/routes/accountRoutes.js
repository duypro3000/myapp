const express = require('express');
const router = express.Router();
// 🚀 ĐÃ SỬA: Đổi tên 'ensureAuth' -> 'ensureAuthenticated' cho nhất quán
const { ensureAuthenticated } = require('../middleware/auth');
const userModel = require('../models/userModel');
const addressModel = require('../models/addressModel');
const orderModel = require('../models/orderModel');
const wishlistModel = require('../models/wishlistModel');

/* ============================================
 * 👤 TRANG TÀI KHOẢN CHÍNH
 * ============================================ */

// GET /account (Trang chính, hiển thị profile và danh sách địa chỉ)
router.get('/account', ensureAuthenticated, async (req, res, next) => {
  try {
    const addrs = await addressModel.listByUser(req.session.user.id);
    res.render('pages/account', { title: 'Tài khoản', addrs });
  } catch (e) { next(e); }
});

// POST /account (Cập nhật thông tin profile: tên, sđt...)
router.post('/account', ensureAuthenticated, async (req, res, next) => {
  try {
    await userModel.updateProfile(req.session.user.id, req.body);
    // 🚀 Cập nhật lại session để phản ánh thông tin mới trên UI
    const body = req.body || {};
    if (typeof body.full_name !== 'undefined') req.session.user.full_name = body.full_name;
    if (typeof body.phone !== 'undefined') req.session.user.phone = body.phone || null;
    if (typeof body.gender !== 'undefined') req.session.user.gender = body.gender || null;
    if (typeof body.dob !== 'undefined') req.session.user.dob = body.dob || null;
    
    // 🚀 NÂNG CẤP: Thêm flash message
    req.flash('success', 'Đã cập nhật thông tin tài khoản.');
    res.redirect('/account');
  } catch (e) { next(e); }
});

/* ============================================
 * 🛒 ĐƠN HÀNG & YÊU THÍCH
 * ============================================ */

router.get('/account/orders', ensureAuthenticated, async (req, res, next) => {
  try {
    const orders = await orderModel.listByUser(req.session.user.id);
    res.render('pages/orders', { title: 'Đơn hàng của tôi', orders });
  } catch (e) { next(e); }
});

// Alias: /orders -> /account/orders (giữ link cũ)
router.get('/orders', ensureAuthenticated, (req, res) => {
  res.redirect('/account/orders');
});

router.get('/account/wishlist', ensureAuthenticated, async (req, res, next) => {
  try {
    const items = await wishlistModel.listByUser(req.session.user.id);
    res.render('pages/wishlist', { title: 'Yêu thích', items });
  } catch (e) { next(e); }
});

/* ============================================
 * 🏠 ADDRESS BOOK (Sổ địa chỉ) - 🚀 ĐÃ THÊM
 * ============================================ */

/**
 * 1. GET /account/addresses/new (Hiển thị form thêm mới)
 */
router.get('/account/addresses/new', ensureAuthenticated, (req, res) => {
  res.render('pages/address-form', { // 🚀 View này chúng ta sẽ tạo
    title: 'Thêm địa chỉ mới',
    address: {} // Gửi đối tượng rỗng
  });
});

/**
 * 2. POST /account/addresses/new (Xử lý thêm mới)
 */
router.post('/account/addresses/new', ensureAuthenticated, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    await addressModel.addAddress(userId, req.body);
    req.flash('success', 'Đã thêm địa chỉ mới.');
    res.redirect('/account');
  } catch (e) { 
    req.flash('error', 'Thêm địa chỉ thất bại.');
    next(e); 
  }
});

/**
 * 3. GET /account/addresses/edit/:id (Hiển thị form sửa)
 */
router.get('/account/addresses/edit/:id', ensureAuthenticated, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const addressId = req.params.id;
    // Tìm địa chỉ và đảm bảo nó thuộc về user này
    const address = await addressModel.findById(addressId, userId); 

    if (!address) {
      req.flash('error', 'Không tìm thấy địa chỉ.');
      return res.redirect('/account');
    }

    res.render('pages/address-form', { // 🚀 Dùng chung view form
      title: 'Sửa địa chỉ',
      address: address // Gửi dữ liệu địa chỉ để điền vào form
    });
  } catch (e) { next(e); }
});

/**
 * 4. POST /account/addresses/edit/:id (Xử lý sửa)
 */
router.post('/account/addresses/edit/:id', ensureAuthenticated, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const addressId = req.params.id;
    await addressModel.updateAddress(addressId, userId, req.body);
    req.flash('success', 'Đã cập nhật địa chỉ.');
    res.redirect('/account');
  } catch (e) { 
    req.flash('error', 'Cập nhật địa chỉ thất bại.');
    next(e); 
  }
});

/**
 * 5. POST /account/addresses/delete/:id (Xử lý xóa)
 */
router.post('/account/addresses/delete/:id', ensureAuthenticated, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const addressId = req.params.id;
    await addressModel.deleteAddress(addressId, userId);
    req.flash('success', 'Đã xóa địa chỉ.');
    res.redirect('/account');
  } catch (e) { 
    req.flash('error', 'Xóa địa chỉ thất bại.');
    next(e); 
  }
});

/**
 * 6. POST /account/addresses/set-default/:id (Xử lý đặt làm mặc định)
 */
router.post('/account/addresses/set-default/:id', ensureAuthenticated, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const addressId = req.params.id;
    await addressModel.setDefault(userId, addressId);
    req.flash('success', 'Đã đặt làm địa chỉ mặc định.');
    res.redirect('/account');
  } catch (e) { 
    req.flash('error', 'Đặt mặc định thất bại.');
    next(e); 
  }
});

module.exports = router;