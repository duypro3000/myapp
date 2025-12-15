const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { validate } = require('../middleware/validation');
const userModel = require('../models/userModel');
const { verifyPassword } = require('../utils/passwords');
const { sendResetPasswordEmail } = require('../services/emailService');

/* ============================================
    🔑 AUTH CONTROLLERS
============================================ */

/**
 * GET /login
 */
router.get('/login', (req, res) => {
  res.render('pages/login', {
    title: 'Đăng nhập',
    nextUrl: req.query.next || '/',
    error: null
  });
});

/**
 * GET /register
 */
router.get('/register', (req, res) => {
  res.render('pages/register', { title: 'Đăng ký', error: null });
});

/**
 * POST /register
 */
router.post(
  '/register',
  validate([
    { name: 'email', required: true },
    { name: 'username', required: true },
    { name: 'password', required: true }
  ]),
  async (req, res, next) => {
    try {
      const { email, username, password, confirm } = req.body;

      // Kiểm tra xác nhận mật khẩu
      if (password !== confirm) {
        return res.render('pages/register', {
          title: 'Đăng ký',
          error: 'Mật khẩu xác nhận không khớp.'
        });
      }

      // 🚀 NÂNG CẤP: Kiểm tra cả email và username đã tồn tại
      const emailExists = await userModel.findByEmail(email);
      if (emailExists) {
        return res.render('pages/register', {
          title: 'Đăng ký',
          error: 'Email này đã được sử dụng.'
        });
      }

      // 🚀 NÂNG CẤP: Thêm bước kiểm tra username
      // (Bạn cần đảm bảo hàm `findByUsername` tồn tại trong `userModel`)
      const usernameExists = await userModel.findByUsername(username);
      if (usernameExists) {
        return res.render('pages/register', {
          title: 'Đăng ký',
          error: 'Username này đã được sử dụng.'
        });
      }
      
      // Tạo người dùng mới
      const user = await userModel.createUser({
        email,
        username,
        password,
        full_name: username
      });

      req.session.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        role: user.role
      };

      req.flash('success', 'Đăng ký thành công! Chào mừng bạn đến với TechShop Blue 💙');
      res.redirect('/');
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
);

/**
 * POST /login
 */
router.post(
  '/login',
  // 🚀 ĐÃ SỬA: Yêu cầu 'username' thay vì 'email'
  validate([
    { name: 'username', required: true },
    { name: 'password', required: true }
  ]),
  async (req, res, next) => {
    try {
      // 🚀 ĐÃ SỬA: Đọc 'username' từ body (code cũ của bạn đã đúng)
      const { username, password } = req.body;
      const nextUrl = req.body.next || '/';

      // 🚀 ĐÃ SỬA: Tìm bằng username thay vì email
      // (Bạn CẦN PHẢI tạo hàm `findByUsername` trong tệp `userModel.js`)
      const user = await userModel.findByUsername(username);
      
      if (!user) {
        return res.render('pages/login', {
          title: 'Đăng nhập',
          // 🚀 ĐÃ SỬA: Cập nhật thông báo lỗi
          error: 'Tên đăng nhập hoặc mật khẩu không đúng.',
          nextUrl
        });
      }

      const ok = await verifyPassword(password, user.password_hash);
      if (!ok) {
        return res.render('pages/login', {
          title: 'Đăng nhập',
          // 🚀 ĐÃ SỬA: Cập nhật thông báo lỗi
          error: 'Tên đăng nhập hoặc mật khẩu không đúng.',
          nextUrl
        });
      }

      req.session.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        role: user.role
      };

      req.flash('success', `Xin chào ${user.full_name}! 👋`);
      req.session.save(() => res.redirect(nextUrl));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /logout
 */
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error(err);
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

/* ============================================
    🔁 FORGOT / RESET PASSWORD
============================================ */

/**
 * GET /forgot
 */
router.get('/forgot', (req, res) => {
  res.render('pages/forgot', { title: 'Quên mật khẩu' });
});

/**
 * POST /forgot
 */
router.post('/forgot', async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await userModel.findByEmail(email);

    if (user) {
      const tokenRaw = crypto.randomBytes(24).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex');
      const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 phút

      await userModel.setResetToken(email, tokenHash, expires);
      const base = process.env.APP_BASE_URL || 'http://localhost:3000';
      const link = `${base}/reset/${tokenRaw}`;

      await sendResetPasswordEmail(email, link);
    }

    res.render('pages/static', {
      title: 'Kiểm tra email',
      content: '<p>Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.</p>'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /reset/:token
 */
router.get('/reset/:token', async (req, res) => {
  res.render('pages/reset', {
    title: 'Đặt lại mật khẩu',
    token: req.params.token
  });
});

/**
 * POST /reset/:token
 */
router.post('/reset/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await userModel.findByResetToken(tokenHash);

    if (!user) {
      return res.render('pages/static', {
        title: 'Liên kết không hợp lệ',
        content: '<p>Liên kết đã hết hạn hoặc không đúng.</p>'
      });
    }

    await userModel.updatePassword(user.id, password);
    await userModel.clearResetToken(user.id);

    req.flash('success', 'Mật khẩu đã được cập nhật. Bạn có thể đăng nhập ngay.');
    res.redirect('/login');
  } catch (err) {
    next(err);
  }
});

module.exports = router;