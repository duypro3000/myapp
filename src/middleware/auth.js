const { pool } = require('../config/db');


function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }

  // Ghi lại đường dẫn hiện tại để redirect lại sau khi đăng nhập
  const nextUrl = encodeURIComponent(
    req.method === 'GET' ? req.originalUrl : (req.get('Referrer') || '/')
  );
  req.flash?.('warning', 'Bạn cần đăng nhập để tiếp tục.');
  return res.redirect(`/login?next=${nextUrl}`);
}

function ensureAdmin(req, res, next) {
  const user = req.session?.user;

  if (user && user.role === 'admin') {
    return next();
  }

  // Log cảnh báo server-side (để kiểm tra sau)
  console.warn(`[403] Unauthorized admin access by: ${user ? user.email : 'Guest'}`);

  return res.status(403).render('pages/static', {
    title: '403 - Truy cập bị từ chối',
    content: `
      <div style="text-align:center;padding:2rem;">
        <h2>🚫 Không có quyền truy cập</h2>
        <p>Bạn không có quyền vào khu vực quản trị.</p>
        <a href="/" style="display:inline-block;margin-top:1rem" class="btn btn-primary">⬅ Quay lại Trang chủ</a>
      </div>`
  });
}

function attachUserToLocals(req, res, next) {
  // CSRF token cho form
  res.locals.csrfToken = typeof req.csrfToken === 'function' ? req.csrfToken() : null;

  // Gắn thông tin người dùng đang đăng nhập
  res.locals.currentUser = req.session?.user || null;

  // Thông tin app (sử dụng trong header, footer)
  res.locals.appName = process.env.APP_NAME || 'TechShop Blue';
  res.locals.isAdmin = req.session?.user?.role === 'admin';
  res.locals.isLoggedIn = Boolean(req.session?.user);

  next();
}

async function checkDatabaseConnection(req, res, next) {
  try {
    await pool.query('SELECT 1');
    next();
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).render('pages/static', {
      title: '500 - Database Error',
      content: '<p>Không thể kết nối đến cơ sở dữ liệu. Vui lòng thử lại sau.</p>'
    });
  }
}

module.exports = {
  ensureAuthenticated, 
  ensureAdmin,
  attachUserToLocals,
  checkDatabaseConnection
};