const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const pixelmatchImport = require('pixelmatch');
const pixelmatch = pixelmatchImport.default || pixelmatchImport;
const { PNG } = require('pngjs');

const OUT_DIR = path.join(process.cwd(), 'tmp-visual');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const sizes = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
];

const targets = [
  { name: 'local', url: 'http://localhost:8081/index.html' },
  { name: 'remote', url: 'https://www.marialuisamacellarolafranca.com/' },
];

async function capture(page, url, filePath, size) {
  await page.setViewportSize({ width: size.width, height: size.height });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: '*{animation: none !important; transition: none !important;} html{scroll-behavior:auto !important;}' });
  await page.evaluate(() => {
    document.querySelectorAll('[data-animation-type="lottie"]').forEach((el) => el.remove());
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: filePath, fullPage: false });
}

async function compareImages(imgAPath, imgBPath, diffPath) {
  const imgA = PNG.sync.read(fs.readFileSync(imgAPath));
  const imgB = PNG.sync.read(fs.readFileSync(imgBPath));
  const { width, height } = imgA;
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(imgA.data, imgB.data, diff.data, width, height, { threshold: 0.1 });
  fs.writeFileSync(diffPath, PNG.sync.write(diff));
  return { diffPixels, totalPixels: width * height };
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });

  const page = await browser.newPage();
  const results = [];

  for (const size of sizes) {
    for (const target of targets) {
      const filePath = path.join(OUT_DIR, `${target.name}-${size.name}.png`);
      await capture(page, target.url, filePath, size);
    }
    const localPath = path.join(OUT_DIR, `local-${size.name}.png`);
    const remotePath = path.join(OUT_DIR, `remote-${size.name}.png`);
    const diffPath = path.join(OUT_DIR, `diff-${size.name}.png`);
    const { diffPixels, totalPixels } = await compareImages(localPath, remotePath, diffPath);
    results.push({ size: size.name, diffPixels, totalPixels });
  }

  await browser.close();

  const summaryPath = path.join(OUT_DIR, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
