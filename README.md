# TechShop Blue — E-commerce (Node.js + Express + PostgreSQL)

Một dự án mẫu **web bán phụ kiện công nghệ** giao diện **màu xanh dương** với đầy đủ chức năng cơ bản:
- Đăng ký / Đăng nhập / Đăng xuất (session + bcrypt)
- Trang chủ, danh mục, chi tiết sản phẩm, tìm kiếm, so sánh nhẹ, wishlist
- Giỏ hàng, áp mã giảm giá, **Checkout** (COD / Chuyển khoản demo)
- Quản trị: Dashboard, Sản phẩm, Danh mục, Thương hiệu, Đơn hàng, Coupon, Banner, Blog, Đánh giá
- Email reset mật khẩu (cấu hình SMTP)
- CSRF, Helmet, Rate limit, XSS sanitize, chống SQLi (pg parameterized)

> **Lưu ý:** Đây là bản nền tảng (MVP) có đủ cấu trúc & tính năng chính để chạy ngay và mở rộng. Tích hợp vận chuyển (GHN/GHTK) và cổng thanh toán (Momo/ZaloPay/VNPay) để ở mức **stub** (chỗ cắm sẵn).

## Yêu cầu
- Node.js 18+
- PostgreSQL 13+

## Cài đặt nhanh
```bash
# 1) Tạo DB và user (ví dụ)
createdb techshop_blue

# 2) Sao chép file env
cp .env.example .env
# Mở .env để sửa DATABASE_URL, SESSION_SECRET, SMTP nếu muốn gửi email thật

# 3) Cài package và seed dữ liệu
npm install
npm run db:reset   # Tạo schema + dữ liệu mẫu

# 4) Chạy dev
npm run dev
# Mở http://localhost:3000
```

### Tài khoản mẫu
- Admin: **admin@techshop.local** / **Admin@123**
- Khách: **user@techshop.local** / **User@123**

## Cấu trúc
```
techshop-blue/
├─ server.js
├─ package.json
├─ .env.example
├─ README.md
├─ db/
│  ├─ schema.sql
│  └─ seed.sql
├─ scripts/
│  └─ reset-db.js
├─ src/
│  ├─ config/ (db, session, mailer)
│  ├─ middleware/ (auth, csrf, errors, validation)
│  ├─ models/ (...)
│  ├─ routes/  (frontend + admin APIs)
│  ├─ services/ (search, recommendation, payment stub, shipping stub)
│  ├─ utils/ (hash, sanitize, pagination)
│  ├─ views/ (EJS templates for pages + admin)
│  └─ public/ (css/js/img)
```
