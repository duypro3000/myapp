const { pool } = require('../config/db');

async function adjust(variantId, change, reason = 'order') {
  await pool.query('INSERT INTO inventory_movements (variant_id, change, reason) VALUES ($1,$2,$3)', [variantId, change, reason]);
  await pool.query('UPDATE variants SET stock = stock + $1 WHERE id=$2', [change, variantId]);
}

module.exports = { adjust };
