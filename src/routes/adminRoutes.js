const express = require('express');
const router = express.Router();
const { ensureAdmin } = require('../middleware/auth');
const { upload } = require('../utils/uploader');
const path = require('path');

// Models
const orderModel = require('../models/orderModel');
const categoryModel = require('../models/categoryModel');
const productModel = require('../models/productModel');
const userModel = require('../models/userModel'); 

// Đảm bảo tất cả các route trong tệp này đều được bảo vệ
router.use(ensureAdmin);

// 🚀 ĐÃ THÊM: CÀI ĐẶT LAYOUT CHO TOÀN BỘ TRANG ADMIN
// Middleware này báo cho Express: 
// "Hãy dùng layout 'admin-layout' cho TẤT CẢ các route trong tệp này"
router.use((req, res, next) => {
  res.locals.layout = 'layouts/admin-layout';
  next();
});

/* ============================================
 * 🏠 DASHBOARD
 * ============================================ */
router.get('/', async (req, res, next) => {
  try {
    const { items } = await orderModel.listAll({ page: 1, limit: 10 }); 

    // Metrics
    const { pool } = require('../config/db');
    const m1 = await pool.query("SELECT COALESCE(SUM(grand_total),0) AS revenue FROM orders WHERE DATE(created_at)=CURRENT_DATE");
    const m1p = await pool.query("SELECT COALESCE(SUM(grand_total),0) AS revenue FROM orders WHERE DATE(created_at)=CURRENT_DATE AND payment_status='paid'");
    const m2 = await pool.query("SELECT COUNT(*)::int AS cnt FROM orders WHERE DATE(created_at)=CURRENT_DATE");
    const m3 = await pool.query("SELECT COUNT(*)::int AS cnt FROM users WHERE DATE(created_at)=CURRENT_DATE");
    const m4 = await pool.query("SELECT COUNT(*)::int AS cnt FROM products WHERE status='active'");
    const metrics = {
      todayRevenue: Number(m1.rows[0].revenue || 0),
      todayRevenuePaid: Number(m1p.rows[0].revenue || 0),
      newOrders: Number(m2.rows[0].cnt || 0),
      newCustomers: Number(m3.rows[0].cnt || 0),
      activeProducts: Number(m4.rows[0].cnt || 0)
    };

    res.render('admin/dashboard', { 
      title: 'Dashboard', 
      orders: items,
      metrics,
      csrfToken: req.csrfToken(),
      layout: 'layouts/admin-layout'
    });
  } catch (e) { next(e); }
});


/* ============================================
 * 🛒 ORDER MANAGEMENT (QUẢN LÝ ĐƠN HÀNG)
 * ============================================ */
router.get('/orders', async (req, res, next) => {
  try {
    const { items, total, page, pages } = await orderModel.listAll(req.query);
    res.render('admin/orders', { 
      title: 'Quản lý Đơn hàng',
      orders: items,
      total, page, pages,
      q: req.query.q || '', 
      status: req.query.status || '', 
      csrfToken: req.csrfToken(),
      layout: 'layouts/admin-layout'
    });
  } catch (e) { next(e); }
});

router.get('/orders/:id', async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const order = await orderModel.findDetailsById(orderId);

    if (!order) {
      req.flash('error', 'Không tìm thấy đơn hàng.');
      return res.redirect('/admin/orders');
    }
    const orderStatuses = ['new', 'processing', 'shipped', 'delivered', 'cancelled'];

    res.render('admin/order-detail', { 
      title: `Chi tiết Đơn hàng #${order.order_number}`,
      order: order,
      orderStatuses: orderStatuses,
      csrfToken: req.csrfToken(),
      layout: 'layouts/admin-layout'
    });
  } catch (e) { next(e); }
});

router.post('/orders/update-status/:id', async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body; 

    if (!status) {
      req.flash('error', 'Vui lòng chọn một trạng thái.');
      return res.redirect('/admin/orders/' + orderId);
    }
    await orderModel.updateStatus(orderId, status);
    req.flash('success', 'Đã cập nhật trạng thái đơn hàng.');
    res.redirect('/admin/orders/' + orderId);
  } catch (e) { 
    req.flash('error', 'Cập nhật trạng thái thất bại.');
    next(e); 
  }
});


/* ============================================
 * 📂 CATEGORIES (Danh mục)
 * ============================================ */
router.get('/categories', async (req, res, next) => {
  try {
    const { items, total, page, pages } = await categoryModel.listAll(req.query);
    res.render('admin/categories_list', {
      title: 'Danh mục',
      cats: items, 
      total, page, pages,
      q: req.query.q || '',
      csrfToken: req.csrfToken(),
      layout: 'layouts/admin-layout'
    });
  } catch (e) { next(e); }
});

router.get('/categories/new', async (req, res, next) => {
  try {
    const allCats = await categoryModel.getAllActive(); 
    res.render('admin/category_form', {
      title: 'Thêm danh mục mới',
      category: {}, 
      allCats: allCats, 
      csrfToken: req.csrfToken(),
      layout: 'layouts/admin-layout'
    });
  } catch (e) { next(e); }
});

router.post('/categories/new', async (req, res, next) => {
  try {
    const slugify = require('slugify');
    const body = { ...req.body };
    const base = (body.slug && body.slug.trim()) ? body.slug.trim() : (body.name || '').trim();
    if (!base) {
      req.flash('error', 'Vui lòng nhập tên danh mục.');
      return res.redirect('/admin/categories/new');
    }
    body.slug = slugify(base, { lower: true, strict: true }) || ('cat-' + Date.now());
    // Tránh trùng slug bằng cách thêm hậu tố ngắn theo thời gian
    body.slug = body.slug + '-' + (Date.now() % 10000);

    const newCategory = await categoryModel.createCategory(body);
    req.flash('success', `Đã tạo danh mục "${newCategory.name}" thành công.`);
    res.redirect('/admin/categories/edit/' + newCategory.id);
  } catch (e) { next(e); }
});

router.get('/categories/edit/:id', async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    const category = await categoryModel.findById(categoryId);
    if (!category) {
      req.flash('error', 'Không tìm thấy danh mục.');
      return res.redirect('/admin/categories');
    }
    const allCats = await categoryModel.getAllActive();
    res.render('admin/category_form', {
      title: 'Sửa danh mục',
      category: category, 
      allCats: allCats,
      csrfToken: req.csrfToken(),
      layout: 'layouts/admin-layout'
    });
  } catch (e) { next(e); }
});

router.post('/categories/edit/:id', async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    const slugify = require('slugify');
    const body = { ...req.body };
    if (body.name && (!body.slug || !body.slug.trim())) {
      body.slug = slugify(body.name, { lower: true, strict: true }) + '-' + (Date.now() % 10000);
    }
    const updatedCategory = await categoryModel.updateCategory(categoryId, body);
    req.flash('success', `Đã cập nhật "${updatedCategory.name}".`);
    res.redirect('/admin/categories/edit/' + categoryId);
  } catch (e) { next(e); }
});

router.post('/categories/hide/:id', async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    await categoryModel.setActive(categoryId, false);
    req.flash('success', 'Đã ẩn danh mục.');
    res.redirect('/admin/categories');
  } catch (e) { next(e); }
});

router.post('/categories/unhide/:id', async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    await categoryModel.setActive(categoryId, true);
    req.flash('success', 'Đã hiển thị danh mục.');
    res.redirect('/admin/categories');
  } catch (e) { next(e); }
});

router.post('/categories/delete/:id', async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    await categoryModel.hardDeleteCategory(categoryId);
    req.flash('success', 'Đã xóa vĩnh viễn danh mục.');
    res.redirect('/admin/categories');
  } catch (e) { next(e); }
});


/* ============================================
 * 🚀 PRODUCT MANAGEMENT (QUẢN LÝ SẢN PHẨM)
 * ============================================ */
router.get('/products', async (req, res, next) => {
  try {
    const { items, total, page, pages } = await productModel.listAll(req.query);
    res.render('admin/products', {
      title: 'Sản phẩm',
      products: items,
      total, page, pages,
      q: req.query.q || '',
      csrfToken: req.csrfToken(),
      layout: 'layouts/admin-layout'
    });
  } catch (e) { next(e); }
});

router.get('/products/new', async (req, res, next) => {
  try {
    const cats = await categoryModel.getAllActive(); 
    res.render('admin/product-form', {
      title: 'Thêm sản phẩm mới',
      product: {}, 
      cats: cats,
      csrfToken: req.csrfToken(),
      layout: 'layouts/admin-layout'
    });
  } catch (e) { next(e); }
});

router.post('/products/new', upload.fields([
  { name: 'cover_image_file', maxCount: 1 },
  { name: 'product_images', maxCount: 10 }
]), async (req, res, next) => {
  try {
    const slugify = require('slugify');
    const body = { ...req.body };
    const base = (body.slug && body.slug.trim()) ? body.slug.trim() : (body.name || '').trim();
    if (!base) {
      req.flash('error', 'Vui lòng nhập tên sản phẩm.');
      return res.redirect('/admin/products/new');
    }
    body.slug = slugify(base, { lower: true, strict: true }) || ('sp-' + Date.now());
    body.slug = body.slug + '-' + (Date.now() % 10000);
    
    // Xử lý ảnh bìa upload
    if (req.files && req.files['cover_image_file'] && req.files['cover_image_file'][0]) {
      const file = req.files['cover_image_file'][0];
      body.cover_image_url = '/public/uploads/' + file.filename;
    } else if (body.cover_image_url && body.cover_image_url.trim()) {
      // Giữ nguyên link nếu không upload file mới
      body.cover_image_url = body.cover_image_url.trim();
    } else {
      body.cover_image_url = null;
    }
    
    const newProduct = await productModel.createProduct(body);
    
    // Xử lý ảnh sản phẩm upload
    const imageArray = [];
    
    // Upload từ file
    if (req.files && req.files['product_images']) {
      req.files['product_images'].forEach((file, index) => {
        imageArray.push({
          url: '/public/uploads/' + file.filename,
          sort_order: index + 1
        });
      });
    }
    
    // Thêm từ link (nếu có)
    if (body.image_urls) {
      let urlArray = [];
      if (typeof body.image_urls === 'string') {
        urlArray = body.image_urls
          .split(/\n|,/)
          .map(url => url.trim())
          .filter(url => url && url.length > 0);
      } else if (Array.isArray(body.image_urls)) {
        urlArray = body.image_urls.map(url => url.trim()).filter(url => url && url.length > 0);
      }
      
      urlArray.forEach((url, index) => {
        imageArray.push({
          url: url,
          sort_order: imageArray.length + index + 1
        });
      });
    }
    
    if (imageArray.length > 0) {
      await productModel.updateProductImages(newProduct.id, imageArray);
    }
    
    req.flash('success', `Đã tạo sản phẩm "${newProduct.name}" thành công.`);
    res.redirect('/admin/products/edit/' + newProduct.id); 
  } catch (e) { next(e); }
});

router.get('/products/edit/:id', async (req, res, next) => {
  try {
    const productId = req.params.id;
    const product = await productModel.findById(productId);
    if (!product) {
      req.flash('error', 'Không tìm thấy sản phẩm.');
      return res.redirect('/admin/products');
    }
    const cats = await categoryModel.getAllActive(); 
    res.render('admin/product-form', {
      title: 'Sửa sản phẩm',
      product: product, 
      cats: cats,
      csrfToken: req.csrfToken(),
      layout: 'layouts/admin-layout'
    });
  } catch (e) { next(e); }
});

router.post('/products/edit/:id', upload.fields([
  { name: 'cover_image_file', maxCount: 1 },
  { name: 'product_images', maxCount: 10 }
]), async (req, res, next) => {
  try {
    const productId = req.params.id;
    const slugify = require('slugify');
    const body = { ...req.body };
    if (body.name && (!body.slug || !body.slug.trim())) {
      body.slug = slugify(body.name, { lower: true, strict: true }) + '-' + (Date.now() % 10000);
    }
    
    // Xử lý ảnh bìa upload
    if (req.files && req.files['cover_image_file'] && req.files['cover_image_file'][0]) {
      const file = req.files['cover_image_file'][0];
      body.cover_image_url = '/public/uploads/' + file.filename;
    } else if (body.cover_image_url && body.cover_image_url.trim()) {
      // Giữ nguyên link nếu không upload file mới
      body.cover_image_url = body.cover_image_url.trim();
    }
    
    // Lấy danh sách ảnh hiện tại
    const currentProduct = await productModel.findById(productId);
    let existingImages = (currentProduct && currentProduct.images) ? currentProduct.images.map(img => ({
      url: img.url,
      sort_order: img.sort_order || 0
    })) : [];
    
    // Xử lý ảnh sản phẩm upload
    const imageArray = [...existingImages]; // Bắt đầu với ảnh hiện tại
    
    // Upload từ file mới - thêm vào danh sách
    if (req.files && req.files['product_images']) {
      req.files['product_images'].forEach((file, index) => {
        imageArray.push({
          url: '/public/uploads/' + file.filename,
          sort_order: imageArray.length + 1
        });
      });
    }
    
    // Thêm từ link (nếu có)
    if (body.image_urls && body.image_urls.trim()) {
      const urlArray = body.image_urls
        .split(/\n|,/)
        .map(url => url.trim())
        .filter(url => url && url.length > 0);
      
      urlArray.forEach((url) => {
        // Chỉ thêm nếu chưa có trong danh sách
        if (!imageArray.some(img => img.url === url)) {
          imageArray.push({
            url: url,
            sort_order: imageArray.length + 1
          });
        }
      });
    }
    
    // Cập nhật lại sort_order
    imageArray.forEach((img, index) => {
      img.sort_order = index + 1;
    });
    
    // Cập nhật ảnh sản phẩm (luôn cập nhật để đảm bảo sort_order đúng)
    await productModel.updateProductImages(productId, imageArray);
    
    const updatedProduct = await productModel.updateProduct(productId, body);
    req.flash('success', `Đã cập nhật "${updatedProduct.name}".`);
    res.redirect('/admin/products/edit/' + productId);
  } catch (e) { next(e); }
});

router.post('/products/hide/:id', async (req, res, next) => {
  try {
    const productId = req.params.id;
    await productModel.setStatus(productId, 'archived');
    req.flash('success', 'Đã ẩn sản phẩm.');
    res.redirect('/admin/products');
  } catch (e) { next(e); }
});

router.post('/products/unhide/:id', async (req, res, next) => {
  try {
    const productId = req.params.id;
    await productModel.setStatus(productId, 'active');
    req.flash('success', 'Đã hiển thị sản phẩm.');
    res.redirect('/admin/products');
  } catch (e) { next(e); }
});

router.post('/products/delete/:id', async (req, res, next) => {
  try {
    const productId = req.params.id;
    await productModel.deleteProduct(productId);
    req.flash('success', 'Đã xóa vĩnh viễn sản phẩm.');
    res.redirect('/admin/products');
  } catch (e) { next(e); }
});


/* ============================================
 * 👤 USER MANAGEMENT (QUẢN LÝ KHÁCH HÀNG)
 * ============================================ */
router.get('/users', async (req, res, next) => {
  try {
    const { items, total, page, pages } = await userModel.listAll(req.query);
    res.render('admin/users', { 
      title: 'Khách hàng',
      users: items,
      total, page, pages,
      q: req.query.q || '',
      csrfToken: req.csrfToken(),
      layout: 'layouts/admin-layout' 
    });
  } catch (e) { next(e); }
});

router.get('/users/edit/:id', async (req, res, next) => {
  try {
    const user = await userModel.findById(req.params.id); 
    if (!user) {
      req.flash('error', 'Không tìm thấy người dùng.');
      return res.redirect('/admin/users');
    }
    res.render('admin/user-form', { 
      title: `Sửa Người dùng: ${user.username}`,
      user: user,
      csrfToken: req.csrfToken(),
      layout: 'layouts/admin-layout'
    });
  } catch (e) { next(e); }
});

router.post('/users/edit/:id', async (req, res, next) => {
  try {
    const userId = req.params.id;
    const updatedUser = await userModel.updateUser(userId, req.body);
    
    req.flash('success', `Đã cập nhật người dùng "${updatedUser.username}".`);
    res.redirect('/admin/users/edit/' + userId);
  } catch (e) { next(e); }
});


module.exports = router;