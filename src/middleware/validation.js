function validate(fields, source = 'body') {
  return function(req, res, next) {
    const src = req[source] || {};
    for (const f of fields) {
      if (f.required && (src[f.name] === undefined || src[f.name] === null || String(src[f.name]).trim() === '')) {
        return res.status(400).render('pages/static', { title: 'Thiếu dữ liệu', content: `<p>Thiếu trường: ${f.name}</p>` });
      }
    }
    next();
  };
}
module.exports = { validate };
