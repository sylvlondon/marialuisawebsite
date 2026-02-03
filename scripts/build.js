const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = path.join(process.cwd(), 'src');
const buildPath = path.join(srcDir, 'build.txt');
const now = new Date().toISOString();
const content = `build: ${now}\nsource: https://www.marialuisamacellarolafranca.com/\n`;

fs.writeFileSync(buildPath, content, 'utf8');
execSync('npx eleventy', { stdio: 'inherit' });
