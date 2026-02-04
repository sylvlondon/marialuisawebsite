const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const cheerio = require('cheerio');

const ROOT = process.cwd();
const SHOWS_PAGES_DIR = path.join(ROOT, 'src/pages/live-show');
const OUT_CONTENT_DIR = path.join(ROOT, 'src/content/live-show');
const DATA_DIR = path.join(ROOT, 'src/_data');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function slugFromHref(href) {
  return href.replace(/^\.\//, '').replace(/^\.\.\//, '').replace(/^live-show\//, '').replace(/\.html$/, '');
}

function extractOtherSlugs($) {
  const slugs = [];
  $('.cross-collection .live-link-page').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    slugs.push(slugFromHref(href));
  });
  return slugs;
}

function buildMarkdown(frontMatter, body = '') {
  const lines = ['---'];
  Object.entries(frontMatter).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      value.forEach((item) => lines.push(`  - "${String(item).replace(/"/g, '\\"')}"`));
      return;
    }
    lines.push(`${key}: "${String(value).replace(/"/g, '\\"')}"`);
  });
  lines.push('---');
  return `${lines.join('\n')}\n${body.trim()}\n`;
}

function main() {
  ensureDir(OUT_CONTENT_DIR);
  ensureDir(DATA_DIR);

  const dataOut = [];

  const files = fs.readdirSync(SHOWS_PAGES_DIR).filter((f) => f.endsWith('.html'));
  files.forEach((file) => {
    const fullPath = path.join(SHOWS_PAGES_DIR, file);
    const raw = fs.readFileSync(fullPath, 'utf8');
    const parsed = matter(raw);
    const slug = file.replace(/\.html$/, '');

    const $ = cheerio.load(parsed.content, { decodeEntities: false });
    const titleEl = $('.live-item-title').first();
    const dateEls = $('.live-date .date');
    const locationEl = $('.live-details .localization, .live-details .localization-link').first();
    const timeEl = $('.live-details .time').first();
    const richText = $('.rich-text.live-shows').first();

    const datePart1 = $(dateEls[0]).text().trim();
    const datePart2 = $(dateEls[1]).text().trim();

    const otherSlugs = extractOtherSlugs($);

    const frontMatter = {
      layout: 'layouts/live-item.njk',
      tags: 'shows',
      permalink: `live-show/${slug}.html`,
      title: parsed.data.title || '',
      description: parsed.data.description || '',
      og_title: parsed.data.og_title || '',
      twitter_title: parsed.data.twitter_title || '',
      css_href: parsed.data.css_href || '',
      favicon_href: parsed.data.favicon_href || '',
      webclip_href: parsed.data.webclip_href || '',
      html_attrs: parsed.data.html_attrs || '',
      section: parsed.data.section || 'shows',
      nav_current: parsed.data.nav_current || 'false',
      nav_prefix: parsed.data.nav_prefix || '..',
      asset_prefix: parsed.data.asset_prefix || '../..',
      show_title: titleEl.text().trim(),
      date_part_one: datePart1,
      date_part_two: datePart2,
      location: locationEl.text().trim(),
      time: timeEl.text().trim(),
      show_body: richText.html() ? richText.html().trim() : '',
      other_slugs: otherSlugs,
    };

    const mdPath = path.join(OUT_CONTENT_DIR, `${slug}.md`);
    fs.writeFileSync(mdPath, buildMarkdown(frontMatter, ''), 'utf8');

    dataOut.push({
      slug,
      permalink: `live-show/${slug}.html`,
      show_title: frontMatter.show_title,
      date_part_one: datePart1,
      date_part_two: datePart2,
      location: frontMatter.location,
      time: frontMatter.time,
    });
  });

  fs.writeFileSync(path.join(DATA_DIR, 'shows.json'), JSON.stringify(dataOut, null, 2));
}

main();
