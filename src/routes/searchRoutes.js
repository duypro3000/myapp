const express = require('express');
const router = express.Router();
const productModel = require('../models/productModel');
const categoryModel = require('../models/categoryModel');
const { suggest } = require('../services/searchService');

router.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const page = parseInt(req.query.page || 1, 10);
    
    // Lấy các filters từ query
    const filters = {
      min_price: req.query.min_price || null,
      max_price: req.query.max_price || null,
      category_id: req.query.category || null,
      brand_id: req.query.brand || null,
      sort: req.query.sort || 'newest'
    };
    
    // Lấy danh sách categories để hiển thị trong filter
    const categories = await categoryModel.getAllActive();
    
    // Tìm kiếm sản phẩm (có hoặc không có từ khóa)
    const found = await productModel.search(q, page, 12, filters);
    
    res.render('pages/search', { 
      title: q ? `Tìm kiếm: ${q}` : 'Tìm kiếm sản phẩm', 
      items: found.items, 
      q, 
      total: found.total,
      page,
      filters,
      categories
    });
  } catch (e) { next(e); }
});

router.get('/api/search/suggest', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    const s = await suggest(q, 6);
    res.json(s);
  } catch (e) { next(e); }
});

module.exports = router;
