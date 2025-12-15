function estimateShippingFee(method, cartWeightKg = 0.5) {
  // Simple fee model
  const table = {
    'economy': { base: 15000, perKg: 5000, days: [3,6] },
    'standard': { base: 25000, perKg: 7000, days: [2,4] },
    'express': { base: 40000, perKg: 9000, days: [1,2] },
  };
  const m = table[method] || table['standard'];
  const fee = m.base + Math.ceil(cartWeightKg) * m.perKg;
  const eta = `${m.days[0]}-${m.days[1]} ngày`;
  return { method, fee, eta };
}
module.exports = { estimateShippingFee };
