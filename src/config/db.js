const { Pool } = require('pg');
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });

pool.on('error', (err) => {
  console.error('PG Pool error', err);
});

module.exports = { pool };
