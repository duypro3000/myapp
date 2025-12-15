function notFound(req, res, next) {
  res.status(404).render('pages/static', { title: '404 - Không tìm thấy', content: '<p>Trang bạn yêu cầu không tồn tại.</p>' });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(500).render('pages/static', { title: 'Lỗi hệ thống', content: '<p>Đã xảy ra lỗi, vui lòng thử lại sau.</p>' });
}

module.exports = { notFound, errorHandler };
