const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const PAGES_DIR = path.join(SRC_DIR, 'pages');

const ASSET_DIR = path.join(SRC_DIR, 'assets');
const ASSET_FOLDERS = [
  'cdn.prod.website-files.com',
  'js',
  'static',
];

const ROOT_FILES = ['robots.txt', 'build.txt'];

const HTML_ROOT_FILES = [
  'index.html',
  'about.html',
  'music.html',
  'music.1.html',
  'press.html',
  'shows.html',
];

const SUB_DIRS = ['music', 'news', 'live-show'];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readHtml(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writePage(outPath, frontMatter, content) {
  ensureDir(path.dirname(outPath));
  const fmLines = ['---'];
  Object.entries(frontMatter).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    if (Array.isArray(value)) {
      fmLines.push(`${key}:`);
      value.forEach((item) => fmLines.push(`  - "${escapeYaml(item)}"`));
      return;
    }
    if (typeof value === 'string' && value.includes('\n')) {
      fmLines.push(`${key}: |`);
      value.split('\n').forEach((line) => fmLines.push(`  ${line}`));
      return;
    }
    fmLines.push(`${key}: "${escapeYaml(String(value))}"`);
  });
  fmLines.push('---');
  const fileContent = `${fmLines.join('\n')}\n${content.trim()}\n`;
  fs.writeFileSync(outPath, fileContent, 'utf8');
}

function escapeYaml(value) {
  return value.replace(/"/g, '\\"');
}

function extractPageData(filePath) {
  const html = readHtml(filePath);
  const $ = cheerio.load(html, { decodeEntities: false });

  const htmlAttrs = $('html').attr() || {};
  const bodyAttrs = $('body').attr() || {};
  const head = $('head');

  const title = head.find('title').first().text().trim();
  const description = head.find('meta[name="description"]').attr('content') || '';
  const ogTitle = head.find('meta[property="og:title"]').attr('content') || '';
  const ogDescription = head.find('meta[property="og:description"]').attr('content') || '';
  const ogImage = head.find('meta[property="og:image"]').attr('content') || '';
  const ogType = head.find('meta[property="og:type"]').attr('content') || '';
  const twitterTitle = head.find('meta[property="twitter:title"]').attr('content') || '';
  const twitterDescription = head.find('meta[property="twitter:description"]').attr('content') || '';
  const twitterImage = head.find('meta[property="twitter:image"]').attr('content') || '';
  const twitterCard = head.find('meta[name="twitter:card"]').attr('content') || '';

  const cssHref = head.find('link[rel="stylesheet"]').attr('href') || '';
  const faviconHref = head.find('link[rel="shortcut icon"]').attr('href') || '';
  const webclipHref = head.find('link[rel="apple-touch-icon"]').attr('href') || '';

  const headStyles = head.find('style').map((_, el) => $.html(el)).get().join('\n').trim();

  const headClone = head.clone();
  headClone.find('meta[charset]').remove();
  headClone.find('title').remove();
  headClone.find('meta[name="description"]').remove();
  headClone.find('meta[property="og:title"]').remove();
  headClone.find('meta[property="og:description"]').remove();
  headClone.find('meta[property="og:image"]').remove();
  headClone.find('meta[property="og:type"]').remove();
  headClone.find('meta[property="twitter:title"]').remove();
  headClone.find('meta[property="twitter:description"]').remove();
  headClone.find('meta[property="twitter:image"]').remove();
  headClone.find('meta[name="twitter:card"]').remove();
  headClone.find('meta[name="viewport"]').remove();
  headClone.find('link[rel="stylesheet"]').remove();
  headClone.find('link[rel="shortcut icon"]').remove();
  headClone.find('link[rel="apple-touch-icon"]').remove();
  headClone.find('style').remove();
  headClone.find('script').remove();

  const headExtra = headClone.html()?.trim() || '';

  const body = $('body');
  body.find('div.page-load').first().remove();
  body.find('div.navbar.w-nav').first().remove();
  body.find('footer.footer').first().remove();
  body.find('script').remove();

  const bodyContent = body.html() || '';

  return {
    htmlAttrs,
    bodyAttrs,
    title,
    description,
    ogTitle,
    ogDescription,
    ogImage,
    ogType,
    twitterTitle,
    twitterDescription,
    twitterImage,
    twitterCard,
    cssHref,
    faviconHref,
    webclipHref,
    headStyles,
    headExtra,
    bodyContent,
  };
}

function toAttrString(attrs) {
  return Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');
}

function classifyPage(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized === 'index.html') return { section: 'home', navCurrent: true, navPrefix: '' };
  if (normalized === 'about.html') return { section: 'about', navCurrent: true, navPrefix: '' };
  if (normalized === 'music.html' || normalized === 'music.1.html') return { section: 'music', navCurrent: true, navPrefix: '' };
  if (normalized === 'press.html') return { section: 'press', navCurrent: true, navPrefix: '' };
  if (normalized === 'shows.html') return { section: 'shows', navCurrent: true, navPrefix: '' };

  if (normalized.startsWith('music/')) return { section: 'music', navCurrent: false, navPrefix: '..' };
  if (normalized.startsWith('news/')) return { section: 'press', navCurrent: false, navPrefix: '..' };
  if (normalized.startsWith('live-show/')) return { section: 'shows', navCurrent: false, navPrefix: '..' };

  return { section: '', navCurrent: false, navPrefix: '' };
}

function assetPrefixFor(filePath) {
  const depth = filePath.split('/').length - 1;
  return depth === 0 ? '..' : '../..';
}

function run() {
  ensureDir(SRC_DIR);
  ensureDir(PAGES_DIR);
  ensureDir(ASSET_DIR);

  const pages = [];
  HTML_ROOT_FILES.forEach((file) => {
    pages.push(file);
  });

  SUB_DIRS.forEach((dir) => {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) return;
    fs.readdirSync(fullDir).forEach((entry) => {
      if (entry.endsWith('.html')) {
        pages.push(`${dir}/${entry}`);
      }
    });
  });

  pages.forEach((filePath) => {
    const data = extractPageData(path.join(ROOT, filePath));
    const { section, navCurrent, navPrefix } = classifyPage(filePath);

    const fm = {
      layout: 'layouts/base.njk',
      permalink: filePath,
      title: data.title,
      description: data.description,
      og_title: data.ogTitle,
      og_description: data.ogDescription,
      og_image: data.ogImage,
      og_type: data.ogType,
      twitter_title: data.twitterTitle,
      twitter_description: data.twitterDescription,
      twitter_image: data.twitterImage,
      twitter_card: data.twitterCard,
      css_href: data.cssHref,
      favicon_href: data.faviconHref,
      webclip_href: data.webclipHref,
      head_styles: data.headStyles,
      head_extra: data.headExtra,
      html_attrs: toAttrString(data.htmlAttrs),
      body_attrs: toAttrString(data.bodyAttrs),
      section,
      nav_current: navCurrent,
      nav_prefix: navPrefix,
      asset_prefix: assetPrefixFor(filePath),
    };

    const outPath = path.join(PAGES_DIR, filePath);
    writePage(outPath, fm, data.bodyContent);
  });

  ASSET_FOLDERS.forEach((folder) => {
    const src = path.join(ROOT, folder);
    if (fs.existsSync(src)) {
      const dest = path.join(ASSET_DIR, folder);
      ensureDir(path.dirname(dest));
      fs.renameSync(src, dest);
    }
  });

  ROOT_FILES.forEach((file) => {
    const src = path.join(ROOT, file);
    if (fs.existsSync(src)) {
      const dest = path.join(SRC_DIR, file);
      fs.renameSync(src, dest);
    }
  });

  pages.forEach((filePath) => {
    const src = path.join(ROOT, filePath);
    if (fs.existsSync(src)) {
      fs.unlinkSync(src);
    }
  });

  SUB_DIRS.forEach((dir) => {
    const fullDir = path.join(ROOT, dir);
    if (fs.existsSync(fullDir)) {
      const remaining = fs.readdirSync(fullDir);
      if (remaining.length === 0) {
        fs.rmdirSync(fullDir);
      }
    }
  });
}

run();
