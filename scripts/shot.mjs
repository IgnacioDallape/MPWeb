// Capturas reales (WebGL incluido) con el Chrome instalado. Uso:
// node scripts/shot.mjs <url> <salida.png> [ancho] [alto] [espera_ms] [--full] [--scroll=px]
import { chromium } from 'playwright-core';
const [url, out, w = '1440', h = '900', wait = '4000', ...flags] = process.argv.slice(2);
const exe = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ executablePath: exe, args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, hasTouch: +w < 1024, isMobile: +w < 1024 });
page.on('pageerror', (e) => console.error('pageerror', e.message));
await page.goto(url, { waitUntil: 'load' });
const scroll = flags.find((f) => f.startsWith('--scroll='));
await page.mouse.move(200, 200);
if (+w < 1024) await page.evaluate(() => dispatchEvent(new Event('touchstart')));
if (scroll) { await page.waitForTimeout(800); await page.evaluate((y) => window.scrollTo(0, y), +scroll.split('=')[1]); }
if (flags.includes('--walk')) { const H = await page.evaluate(() => document.body.scrollHeight); for (let y = 0; y < H; y += 500) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(120); } await page.evaluate(() => window.scrollTo(0, 0)); }
await page.waitForTimeout(+wait);
await page.screenshot({ path: out, fullPage: flags.includes('--full'), omitBackground: flags.includes('--transparent') });
await browser.close();
console.log('ok', out);
