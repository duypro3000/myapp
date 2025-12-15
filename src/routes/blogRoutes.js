const express = require('express');
const router = express.Router();
const blogModel = require('../models/blogModel');

router.get('/blog', async (req, res, next) => {
  try {
    const posts = await blogModel.listPosts(10);
    res.render('pages/blog_list', { title: 'Tin tức & Blog', posts });
  } catch (e) { next(e); }
});

router.get('/blog/:slug', async (req, res, next) => {
  try {
    const post = await blogModel.findBySlug(req.params.slug);
    if (!post) return res.status(404).render('pages/static', { title: 'Không tìm thấy', content: '<p>Bài viết không tồn tại.</p>' });
    res.render('pages/blog_detail', { title: post.title, post });
  } catch (e) { next(e); }
});

module.exports = router;
