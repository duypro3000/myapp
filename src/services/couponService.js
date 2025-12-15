function applyCouponToSubtotal(coupon, subtotal) {
  if (!coupon) return { discount: 0, total: subtotal };
  let discount = 0;
  if (coupon.type === 'percent') {
    discount = Math.round(subtotal * (Number(coupon.value) / 100));
  } else if (coupon.type === 'fixed') {
    discount = Number(coupon.value);
  }
  if (coupon.min_order_value && subtotal < Number(coupon.min_order_value)) {
    discount = 0;
  }
  const total = Math.max(0, subtotal - discount);
  return { discount, total };
}
module.exports = { applyCouponToSubtotal };
