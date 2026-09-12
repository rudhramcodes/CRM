import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function generateGrainTile() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 300, height: 300, deviceScaleFactor: 1 });

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;">
<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
  <filter id="grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" seed="2" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer>
      <feFuncA type="linear" slope="0.08"/>
    </feComponentTransfer>
  </filter>
  <rect width="300" height="300" fill="#FAF6F0"/>
  <rect width="300" height="300" filter="url(#grain)"/>
</svg>
</body></html>`;

  await page.setContent(html, { waitUntil: 'networkidle0' });
  const el = await page.$('svg');
  const outPath = path.join(process.cwd(), 'assets', 'paper-grain-tile.png');
  await el.screenshot({ path: outPath, type: 'png' });
  
  const stats = fs.statSync(outPath);
  console.log(`Generated paper-grain-tile.png: ${stats.size} bytes`);
  await browser.close();
}

generateGrainTile().catch(console.error);
