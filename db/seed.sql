-- Basic data seed
INSERT INTO users (email, username, password_hash, full_name, role, is_active) VALUES
('admin@techshop.local', 'admin', '$2b$10$wABpc182tCGCK33tqgI64uELbNDV3dmlfux6gRLFmQed9oJ8sjlou', 'Admin', 'admin', true),
('user@techshop.local', 'user', '$2b$10$VNRnx936kVh938ezdoaWwOu814YLNtGaGvxL.i2HnbmELoIZ0d31e', 'User Test', 'customer', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO categories (name, slug, description) VALUES
('Bàn phím', 'ban-phim', 'Bàn phím cơ, không dây, gaming'),
('Chuột', 'chuot', 'Chuột gaming, không dây'),
('Tai nghe', 'tai-nghe', 'Tai nghe chụp tai, in-ear'),
('Cáp sạc', 'cap-sac', 'Cáp USB-C, Lightning, HDMI')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO brands (name, slug) VALUES
('LogiTech', 'logitech'),
('Razer', 'razer'),
('Anker', 'anker'),
('HyperX', 'hyperx')
ON CONFLICT (slug) DO NOTHING;

-- Products (simplified)
INSERT INTO products (name, slug, sku, brand_id, category_id, description_short, description_long, specs, cover_image_url, price, sale_price, status) VALUES
('Bàn phím cơ BlueSwitch', 'ban-phim-co-blue', 'KB-BLUE-01', 2, 1, 'Bàn phím cơ switch xanh clicky', '<p>Bảo hành 24 tháng.</p>', '{"switch":"Blue","layout":"87-key"}', '/public/img/placeholder.png', 1290000, 990000, 'active'),
('Chuột không dây Silent', 'chuot-khong-day-silent', 'MS-SILENT-01', 1, 2, 'Chuột không dây 2.4G, pin 18 tháng', '<p>Êm ái, độ ồn thấp.</p>', '{"dpi":"1000-1600","connect":"2.4G"}', '/public/img/placeholder.png', 590000, NULL, 'active'),
('Tai nghe gaming 7.1', 'tai-nghe-gaming-71', 'HS-71-01', 4, 3, 'Âm thanh vòm ảo 7.1', '<p>Đèn RGB, mic khử ồn.</p>', '{"driver":"50mm","connect":"USB"}', '/public/img/placeholder.png', 1590000, 1390000, 'active'),
('Cáp sạc USB-C 100W', 'cap-sac-usbc-100w', 'CB-USBC-100', 3, 4, 'PD 100W, nylon bền bỉ', '<p>Hỗ trợ sạc nhanh.</p>', '{"length":"1m","power":"100W"}', '/public/img/placeholder.png', 290000, 240000, 'active')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_images (product_id, url, alt, sort_order)
SELECT p.id, '/public/img/placeholder.png', 'image', 1 FROM products p;

-- Variants & stock
INSERT INTO variants (product_id, variant_name, sku, stock, price, sale_price) VALUES
((SELECT id FROM products WHERE slug='ban-phim-co-blue'), 'Red Switch', 'KB-RED-01', 20, 1290000, 990000),
((SELECT id FROM products WHERE slug='ban-phim-co-blue'), 'Blue Switch', 'KB-BLUE-02', 12, 1290000, 990000),
((SELECT id FROM products WHERE slug='chuot-khong-day-silent'), 'Đen', 'MS-SILENT-BK', 50, 590000, NULL),
((SELECT id FROM products WHERE slug='chuot-khong-day-silent'), 'Trắng', 'MS-SILENT-WH', 42, 590000, NULL);

-- Flash sale
INSERT INTO flash_sales (name, start_at, end_at, active) VALUES
('Flash 11.11', NOW() - INTERVAL '1 day', NOW() + INTERVAL '5 days', true)
ON CONFLICT DO NOTHING;
INSERT INTO flash_sale_items (flash_sale_id, product_id, flash_price, quantity_limit)
VALUES ((SELECT id FROM flash_sales ORDER BY id DESC LIMIT 1), (SELECT id FROM products WHERE slug='cap-sac-usbc-100w'), 190000, 200)
ON CONFLICT DO NOTHING;

-- Banners
INSERT INTO banners (title, image_url, link_url, position, active)
VALUES ('Mega Sale 11.11', 'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=1600&fit=crop', '/c/ban-phim', 'home_top', true);

-- Coupons
INSERT INTO coupons (code, type, value, min_order_value, start_at, end_at, active)
VALUES ('GIAM10', 'percent', 10, 500000, NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', true)
ON CONFLICT (code) DO NOTHING;

-- Blog posts
INSERT INTO blogs (title, slug, content, excerpt, cover_image_url, author_user_id, published_at, status)
VALUES ('So sánh chuột không dây 2025', 'so-sanh-chuot-2025', '<p>Bài viết so sánh các mẫu chuột đáng mua.</p>', 'Các mẫu chuột đáng mua 2025', 'https://images.unsplash.com/photo-1518443669127-67f3eebf83b4?q=80&w=1600&fit=crop', (SELECT id FROM users WHERE email='admin@techshop.local'), NOW(), 'published')
ON CONFLICT (slug) DO NOTHING;

UPDATE products SET stock_quantity = 200, sold_quantity = 120 WHERE slug='cap-sac-usbc-100w';
