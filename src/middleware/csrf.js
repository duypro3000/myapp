function csrfErrorHandler(err, req, res, next) {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);
  res.status(403).render('pages/static', { 
    title: 'CSRF token không hợp lệ', 
    content: '<p>Vui lòng tải lại trang và thử lại.</p>' 
  });
}
module.exports = { csrfErrorHandler };
