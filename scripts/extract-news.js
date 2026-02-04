const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const cheerio = require('cheerio');

const ROOT = process.cwd();
const PRESS_PAGE = path.join(ROOT, 'src/pages/press.html');
const NEWS_PAGES_DIR = path.join(ROOT, 'src/pages/news');
const OUT_CONTENT_DIR = path.join(ROOT, 'src/content/news');
const DATA_DIR = path.join(ROOT, 'src/_data');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function slugFromHref(href) {
  return href.replace(/^\.\//, '').replace(/^\.\.\//, '').replace(/^news\//, '').replace(/\.html$/, '');
}

function extractPressItems() {
  const html = fs.readFileSync(PRESS_PAGE, 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false });
  const items = [];

  $('.collection-link').each((index, el) => {
    const link = $(el);
    const href = link.attr('href');
    if (!href || !href.includes('news/')) return;
    const slug = slugFromHref(href);
    const img = link.find('img').first();
    const titleEl = link.find('h2, h3').first();
    const tagEl = link.find('.news-tag').first();
    const descEl = link.find('.short-desc').first();

    items.push({
      slug,
      href,
      title_display: titleEl.text().trim(),
      tag: tagEl.text().trim(),
      short_desc: descEl.text().trim(),
      image_src: img.attr('src') || '',
      image_srcset: img.attr('srcset') || '',
      image_sizes: img.attr('sizes') || '',
      image_class: img.attr('class') || '',
      feature: link.hasClass('feature'),
      order: index + 1,
    });
  });

  return items;
}

function extractOtherSlugs($) {
  const slugs = [];
  $('.cross-collection .collection-link').each((_, el) => {
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

  const pressItems = extractPressItems();
  const pressMap = new Map(pressItems.map((item) => [item.slug, item]));

  const dataOut = pressItems.map((item) => ({
    slug: item.slug,
    href: item.href,
    title_display: item.title_display,
    tag: item.tag,
    short_desc: item.short_desc,
    image_src: item.image_src,
    image_srcset: item.image_srcset,
    image_sizes: item.image_sizes,
    image_class: item.image_class,
    feature: item.feature,
    order: item.order,
  }));

  fs.writeFileSync(path.join(DATA_DIR, 'news.json'), JSON.stringify(dataOut, null, 2));

  const files = fs.readdirSync(NEWS_PAGES_DIR).filter((f) => f.endsWith('.html'));
  files.forEach((file) => {
    const fullPath = path.join(NEWS_PAGES_DIR, file);
    const raw = fs.readFileSync(fullPath, 'utf8');
    const parsed = matter(raw);
    const slug = file.replace(/\.html$/, '');

    const $ = cheerio.load(parsed.content, { decodeEntities: false });
    const titleEl = $('h1').first();
    const tagEl = $('.news-tag').first();
    const imageEl = $('.article-feature-img').first();
    const otherSlugs = extractOtherSlugs($);

    const pressItem = pressMap.get(slug) || {};

    const frontMatter = {
      layout: 'layouts/news-item.njk',
      tags: 'news',
      permalink: `news/${slug}.html`,
      title: parsed.data.title || '',
      description: parsed.data.description || '',
      og_title: parsed.data.og_title || '',
      og_description: parsed.data.og_description || '',
      og_image: parsed.data.og_image || '',
      twitter_title: parsed.data.twitter_title || '',
      twitter_description: parsed.data.twitter_description || '',
      twitter_image: parsed.data.twitter_image || '',
      css_href: parsed.data.css_href || '',
      favicon_href: parsed.data.favicon_href || '',
      webclip_href: parsed.data.webclip_href || '',
      html_attrs: parsed.data.html_attrs || '',
      section: parsed.data.section || 'press',
      nav_current: parsed.data.nav_current || 'false',
      nav_prefix: parsed.data.nav_prefix || '..',
      asset_prefix: parsed.data.asset_prefix || '../..',
      page_title: titleEl.text().trim() || pressItem.title_display || '',
      tag: tagEl.text().trim() || pressItem.tag || '',
      image_src: imageEl.attr('src') || pressItem.image_src || '',
      image_srcset: imageEl.attr('srcset') || pressItem.image_srcset || '',
      image_sizes: imageEl.attr('sizes') || pressItem.image_sizes || '',
      short_desc: pressItem.short_desc || '',
      other_slugs: otherSlugs,
    };

    const mdPath = path.join(OUT_CONTENT_DIR, `${slug}.md`);
    fs.writeFileSync(mdPath, buildMarkdown(frontMatter, ''), 'utf8');
  });
}

main();
