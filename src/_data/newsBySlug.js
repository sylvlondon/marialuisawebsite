const fs = require('fs');
const path = require('path');

module.exports = function () {
  const p = path.join(__dirname, 'news.json');
  const news = JSON.parse(fs.readFileSync(p, 'utf8'));
  const out = {};
  for (const n of news) {
    if (!n || !n.slug) continue;
    out[n.slug] = n;
  }
  return out;
};
