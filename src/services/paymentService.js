// Stubs for payment gateways (VNPay/Momo/ZaloPay...)
async function initiatePayment({ method, amount, order }) {
  if (method === 'cod') {
    return { ok: true, redirectUrl: '/thank-you?order=' + order.order_number };
  }
  if (method === 'bank_transfer') {
    return { ok: true, redirectUrl: '/thank-you?order=' + order.order_number };
  }
  // VNPay/Momo/ZaloPay placeholders
  return { ok: true, redirectUrl: '/thank-you?order=' + order.order_number };
}
module.exports = { initiatePayment };
