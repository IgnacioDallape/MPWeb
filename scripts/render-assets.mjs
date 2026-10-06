// Genera los renders 3D (PNG con transparencia → WebP) a partir de src/scripts/lab3d.js.
// Requiere `npm run dev` en marcha. Uso: node scripts/render-assets.mjs [url_base]
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
const base = process.argv[2] || 'http://localhost:4321';
const SCENES = ['slab', 'epi', 'mep', 'nmp', 'puncion', 'tendinosas', 'fascia', 'musculares', 'ligamentarias', 'bursas', 'dolor', 'probe'];
mkdirSync('public/img/3d', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on('pageerror', (e) => console.error('pageerror', e.message));
for (const s of SCENES) {
  await page.goto(`${base}/render-lab/?scene=${s}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__done === true, null, { timeout: 30000 });
  await page.waitForTimeout(300);
  const png = await page.locator('canvas#c').screenshot({ omitBackground: true });
  const img = sharp(png).trim({ threshold: 1 });
  const { width } = await img.clone().metadata();
  await img.clone().resize({ width: Math.min(900, width), withoutEnlargement: true }).webp({ quality: 82, alphaQuality: 90 }).toFile(`public/img/3d/${s}.webp`);
  await img.clone().resize({ width: 480, withoutEnlargement: true }).webp({ quality: 80, alphaQuality: 90 }).toFile(`public/img/3d/${s}-sm.webp`);
  console.log('✓', s);
}
await browser.close();
