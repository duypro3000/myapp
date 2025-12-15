const express = require('express');
const router = express.Router();

const bannerModel = require('../models/bannerModel');
const productModel = require('../models/productModel');
const blogModel = require('../models/blogModel');
const { recommendedForUser } = require('../services/recommendationService');

router.get('/', async (req, res, next) => {
  try {
    // Lấy dữ liệu song song cho trang chủ
    const [banners, best, fresh, flash, posts] = await Promise.all([
      bannerModel.activeBanners(),
      productModel.bestSellers(8),
      productModel.newArrivals(8),
      productModel.flashSaleItems(),
      blogModel.listPosts(3)
    ]);

    // Gợi ý cá nhân hóa
    const rec = await recommendedForUser(req.session.user?.id, 8);

    // Xác định thời gian kết thúc Flash Sale
    // Nếu có dữ liệu từ DB -> dùng, nếu không -> mặc định +2h
    let flashEndsAtISO = null;
    if (flash && flash.length > 0) {
      const firstItem = flash[0];
      if (firstItem.flash_end_time) {
        flashEndsAtISO = new Date(firstItem.flash_end_time).toISOString();
      } else {
        flashEndsAtISO = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      }
    }

    // Render trang chủ
    res.render('pages/index', {
      title: 'Trang chủ',
      banners,
      best,
      fresh,
      flash,
      posts,
      rec,
      flashEndsAtISO
    });
  } catch (e) {
    console.error('[ERROR] Trang chủ:', e);
    next(e);
  }
});

// ===============================
// Các trang tĩnh (Static Pages)
// ===============================

router.get('/about', (req, res) =>
  res.render('pages/static', {
    title: 'Về chúng tôi',
    content: '<p>TechShop Blue - Phụ kiện công nghệ chính hãng, uy tín hàng đầu Việt Nam.</p>'
  })
);

router.get('/contact', (req, res) =>
  res.render('pages/static', {
    title: 'Liên hệ',
    content: `
      <p>Email: <a href="mailto:support@techshop.local">support@techshop.local</a></p>
      <p>Hotline: 1900 6868 (8h00 - 21h00 hàng ngày)</p>
      <p>Địa chỉ: 123 Nguyễn Trãi, Q.1, TP.HCM</p>
    `
  })
);

router.get('/faq', (req, res) =>
  res.render('pages/static', {
    title: 'Câu hỏi thường gặp',
    content: `
      <h3>1. Làm sao để đặt hàng?</h3>
      <p>Chọn sản phẩm, nhấn "Mua ngay" hoặc "Thêm vào giỏ hàng", sau đó điền thông tin thanh toán.</p>
      <h3>2. Thời gian giao hàng?</h3>
      <p>Từ 2-5 ngày tùy khu vực.</p>
    `
  })
);

router.get('/privacy', (req, res) =>
  res.render('pages/static', {
    title: 'Chính sách bảo mật',
    content: '<p>Chúng tôi cam kết bảo mật thông tin khách hàng tuyệt đối.</p>'
  })
);

router.get('/terms', (req, res) =>
  res.render('pages/static', {
    title: 'Điều khoản dịch vụ',
    content: '<p>Khi sử dụng website, bạn đồng ý với các điều khoản của TechShop Blue.</p>'
  })
);

router.get('/shipping-policy', (req, res) =>
  res.render('pages/static', {
    title: 'Chính sách vận chuyển',
    content: '<p>Miễn phí giao hàng với đơn từ 500.000đ. Hỗ trợ toàn quốc.</p>'
  })
);

router.get('/warranty', (req, res) =>
  res.render('pages/static', {
    title: 'Chính sách bảo hành & Đổi trả',
    content: `
      <p>Thời gian bảo hành: 12 tháng đối với hầu hết sản phẩm.</p>
      <p>Đổi trả miễn phí trong 7 ngày nếu lỗi do nhà sản xuất.</p>
    `
  })
);

module.exports = router;
