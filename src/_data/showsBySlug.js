const fs = require('fs');
const path = require('path');

module.exports = function () {
  const p = path.join(__dirname, 'shows.json');
  const shows = JSON.parse(fs.readFileSync(p, 'utf8'));
  const out = {};
  for (const s of shows) {
    if (!s || !s.slug) continue;
    out[s.slug] = s;
  }
  return out;
};
