const express = require('express');
const router = express.Router();

router.get('/compare', (req, res) => {
  res.render('pages/static', { title: 'So sánh sản phẩm', content: '<p>Chọn 2-3 sản phẩm để so sánh (demo).</p>' });
});

module.exports = router;
