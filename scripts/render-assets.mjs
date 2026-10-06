// Genera los renders 3D (PNG con transparencia → WebP) a partir de src/scripts/models/*.js
// y de las escenas de src/scripts/lab3d.js. Requiere `npm run dev` en marcha.
// Uso: node scripts/render-assets.mjs <url_base> [nombre ...]   (sin nombres = todos)
// Además deja una vista previa sobre fondo claro y oscuro en .render-preview/<nombre>.png
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { mkdirSync, readdirSync } from 'node:fs';

const [base = 'http://localhost:4321', ...only] = process.argv.slice(2);
const LEGACY = ['slab', 'probe', 'tendinosas', 'fascia', 'musculares', 'ligamentarias', 'bursas', 'dolor', 'epi', 'mep', 'nmp', 'puncion'];
const MODELS = readdirSync('src/scripts/models').filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));
const SCENES = only.length ? only : [...new Set([...LEGACY, ...MODELS])];
mkdirSync('public/img/3d', { recursive: true });
mkdirSync('.render-preview', { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
let failed = false;
page.on('pageerror', (e) => {
  console.error('pageerror', e.message);
  failed = true;
});
for (const s of SCENES) {
  failed = false;
  await page.goto(`${base}/render-lab/?scene=${s}`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__done === true, null, { timeout: 30000 });
  } catch {
    console.error('✗', s, 'no terminó de renderizar');
    continue;
  }
  if (failed) {
    console.error('✗', s, 'con errores');
    continue;
  }
  await page.waitForTimeout(250);
  const png = await page.locator('canvas#c').screenshot({ omitBackground: true });
  const img = sharp(png).trim({ threshold: 1 });
  const { info } = await img.clone().png().toBuffer({ resolveWithObject: true });
  await img.clone().resize({ width: Math.min(900, info.width), withoutEnlargement: true }).webp({ quality: 82, alphaQuality: 90 }).toFile(`public/img/3d/${s}.webp`);
  await img.clone().resize({ width: 480, withoutEnlargement: true }).webp({ quality: 80, alphaQuality: 90 }).toFile(`public/img/3d/${s}-sm.webp`);
  // Vista previa: mismo render sobre fondo claro y oscuro
  const small = await img.clone().resize({ width: 560, height: 420, fit: 'inside' }).png().toBuffer();
  const tile = (bg) => sharp({ create: { width: 600, height: 460, channels: 4, background: bg } }).composite([{ input: small, gravity: 'center' }]).png().toBuffer();
  const [light, dark] = await Promise.all([tile('#f3f5f9'), tile('#1a2233')]);
  await sharp({ create: { width: 1200, height: 460, channels: 4, background: '#000' } })
    .composite([{ input: light, left: 0, top: 0 }, { input: dark, left: 600, top: 0 }])
    .png()
    .toFile(`.render-preview/${s}.png`);
  console.log('✓', s, `${info.width}x${info.height}`);
}
await browser.close();
