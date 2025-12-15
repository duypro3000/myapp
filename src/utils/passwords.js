const bcrypt = require('bcrypt');

async function hashPassword(password) {
  const saltRounds = 12; 
  return bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = { hashPassword, verifyPassword };