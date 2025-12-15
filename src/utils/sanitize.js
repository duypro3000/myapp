const sanitizeHtml = require('sanitize-html');

function clean(input) {
  if (typeof input !== 'string') return input;
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} });
}

module.exports = { clean };
