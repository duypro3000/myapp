// Run: npm run db:reset
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(__dirname, '..', 'db', 'seed.sql'), 'utf8');
  try {
    await pool.query(schema);
    await pool.query(seed);
    console.log('✔ Database schema & seed done.');
  } catch (e) {
    console.error('DB reset error:', e);
  } finally {
    await pool.end();
  }
})();
