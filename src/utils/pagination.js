function getPagination(page = 1, limit = 12) {
  page = Math.max(1, parseInt(page) || 1);
  limit = Math.min(60, Math.max(1, parseInt(limit) || 12));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

module.exports = { getPagination };
