require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const flash = require('connect-flash');

// 🚀 ĐÃ THÊM: Import thư viện layout
const expressEjsLayouts = require('express-ejs-layouts');

const { pool } = require('./src/config/db');
const sessionConfig = require('./src/config/session');
const { attachUserToLocals } = require('./src/middleware/auth');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const { csrfErrorHandler } = require('./src/middleware/csrf');

const app = express();

/* ---------------- SECURITY ---------------- */
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      // 🚀 NÂNG CẤP: Cho phép SwiperJS (CDN)
      "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      "img-src": ["'self'", "data:", "https:"],
      "connect-src": ["'self'", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method'));

/* ---------------- SESSION ---------------- */
app.use(session({
  store: new PgSession({
    pool,
    tableName: 'session'
  }),
  secret: sessionConfig.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

/* ---------------- FLASH MESSAGES ---------------- */
app.use(flash());
app.use((req, res, next) => {
  res.locals.flash = req.flash();
  next();
});

/* ---------------- RATE LIMIT ---------------- */
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200
});
app.use(limiter);

/* ---------------- STATIC + VIEW ---------------- */

// Sử dụng EJS (không đặt layout mặc định cho public; admin tự đặt qua middleware)
app.use(expressEjsLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
// Tắt layout mặc định cho public (tránh tìm 'layout.ejs')
app.set('layout', false);
app.use('/public', express.static(path.join(__dirname, 'src', 'public')));
// Manifest (để truy cập tại /manifest.json)
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'public', 'manifest.json'));
});

/* ---------------- CSRF ---------------- */
app.use(csrf());
app.use(csrfErrorHandler);

/* ---------------- MIDDLEWARE ---------------- */
app.use(attachUserToLocals);

/* ---------------- ROUTES ---------------- */
// (Route /admin phải được đặt TRƯỚC các route public khác)
app.use('/admin', require('./src/routes/adminRoutes'));

// Các route public
app.use('/', require('./src/routes/publicRoutes'));
app.use('/', require('./src/routes/authRoutes'));
app.use('/', require('./src/routes/accountRoutes'));
app.use('/', require('./src/routes/productRoutes'));
app.use('/', require('./src/routes/cartRoutes'));
app.use('/', require('./src/routes/orderRoutes'));
app.use('/', require('./src/routes/wishlistRoutes'));
app.use('/', require('./src/routes/searchRoutes'));
app.use('/', require('./src/routes/blogRoutes'));
app.use('/', require('./src/routes/cmsRoutes'));

/* ---------------- ERROR HANDLERS ---------------- */
app.use(notFound);
app.use(errorHandler);

/* ---------------- SERVER ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✔ ${process.env.APP_NAME || 'TechShop Blue'} chạy tại http://localhost:${PORT}`);
});