const express = require('express');
const router = express.Router();
const { getOrCreateCart, getItems, addItem, updateQty, removeItem } = require('../models/cartModel');
const { ensureAuthenticated } = require('../middleware/auth');
const productModel = require('../models/productModel');
const orderModel = require('../models/orderModel');
const couponModel = require('../models/couponModel');
const { applyCouponToSubtotal } = require('../services/couponService');
const { estimateShippingFee } = require('../services/shippingService');
const { initiatePayment } = require('../services/paymentService');

function sessionId(req) {
  if (!req.session.sid) req.session.sid = 'sid-' + Date.now();
  return req.session.sid;
}

router.post('/api/cart/add', ensureAuthenticated, async (req, res, next) => {
  try {
    const { product_id, variant_id, quantity } = req.body;
    const prodRes = await req.app.get('pool'); // not used, inline fetch below
    // Read product price for snapshot
    const { pool } = require('../config/db');
    const pr = await pool.query('SELECT id, price, sale_price FROM products WHERE id=$1', [product_id]);
    const product = pr.rows[0];
    if (!product) return res.status(400).json({ ok: false, error: 'Sản phẩm không tồn tại' });
    const price = product.sale_price || product.price;

    const cart = await getOrCreateCart({ userId: req.session?.user?.id, sessionId: sessionId(req) });
    await addItem(cart.id, product_id, variant_id || null, price, Math.max(1, parseInt(quantity || 1)));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Form submit từ trang sản phẩm -> thêm vào giỏ và chuyển tới /cart
router.post('/cart/add', ensureAuthenticated, async (req, res, next) => {
  try {
    const { product_id, variant_id, quantity } = req.body;
    const { pool } = require('../config/db');
    const pr = await pool.query('SELECT id, price, sale_price FROM products WHERE id=$1', [product_id]);
    const product = pr.rows[0];
    if (!product) {
      req.flash('error', 'Sản phẩm không tồn tại.');
      return res.redirect('/cart');
    }
    const price = product.sale_price || product.price;
    const cart = await getOrCreateCart({ userId: req.session?.user?.id, sessionId: sessionId(req) });
    await addItem(cart.id, product_id, variant_id || null, price, Math.max(1, parseInt(quantity || 1)));
    req.flash('success', 'Đã thêm vào giỏ hàng.');
    res.redirect('/cart');
  } catch (e) { next(e); }
});

router.get('/cart', async (req, res, next) => {
  try {
    const cart = await getOrCreateCart({ userId: req.session?.user?.id, sessionId: sessionId(req) });
    const items = await getItems(cart.id);
    const subtotal = items.reduce((s, it) => s + Number(it.price_at) * it.quantity, 0);
    res.render('pages/cart', { title: 'Giỏ hàng', items, subtotal });
  } catch (e) { next(e); }
});

router.post('/cart/update', async (req, res, next) => {
  try {
    const { item_id, quantity } = req.body;
    await updateQty(item_id, Math.max(1, parseInt(quantity || 1)));
    res.redirect('/cart');
  } catch (e) { next(e); }
});

router.post('/cart/remove', async (req, res, next) => {
  try {
    const { item_id } = req.body;
    await removeItem(item_id);
    res.redirect('/cart');
  } catch (e) { next(e); }
});

router.get('/checkout', async (req, res, next) => {
  try {
    const cart = await getOrCreateCart({ userId: req.session?.user?.id, sessionId: sessionId(req) });
    const items = await getItems(cart.id);
    const subtotal = items.reduce((s, it) => s + Number(it.price_at) * it.quantity, 0);
    const ship = estimateShippingFee('standard', 0.5);
    res.render('pages/checkout', { title: 'Thanh toán', items, subtotal, ship, coupon: null });
  } catch (e) { next(e); }
});

router.post('/checkout', async (req, res, next) => {
  try {
    const cart = await getOrCreateCart({ userId: req.session?.user?.id, sessionId: sessionId(req) });
    const items = await getItems(cart.id);
    const subtotal = items.reduce((s, it) => s + Number(it.price_at) * it.quantity, 0);

    // Coupon
    let coupon = null, discount = 0;
    if (req.body.coupon) {
      coupon = await couponModel.findActiveByCode(req.body.coupon.trim());
      const resDiscount = applyCouponToSubtotal(coupon, subtotal);
      discount = resDiscount.discount;
    }

    const shipping = {
      method: req.body.shipping_method || 'standard',
      fee: Number(req.body.shipping_fee || 25000),
      address: {
        full_name: req.body.full_name, phone: req.body.phone, address_line1: req.body.address_line1,
        city: req.body.city, district: req.body.district, province: req.body.province
      }
    };

    const payment = { method: req.body.payment_method || 'cod', discount };
    const order = await orderModel.createOrder({ userId: req.session?.user?.id, cartId: cart.id, shipping, payment, items });
    const pay = await require('../services/paymentService').initiatePayment({ method: payment.method, amount: order.grand_total, order });
    res.redirect(pay.redirectUrl);
  } catch (e) { next(e); }
});

router.get('/thank-you', async (req, res) => {
  res.render('pages/thankyou', { title: 'Cảm ơn', orderNumber: req.query.order });
});

module.exports = router;
