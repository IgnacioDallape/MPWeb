// Pipeline de imágenes (requiere la devDependency "sharp").
// 1) Genera íconos y la imagen Open Graph por defecto.
// 2) Convierte cada foto de src/images/ (jpg/png/webp) a AVIF + WebP + JPG en varios anchos
//    y escribe public/img/manifest.json, que usa el helper picture() para el HTML.
// Uso: npm run images
import sharp from 'sharp';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, parse } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'public/img');
mkdirSync(out, { recursive: true });

// ---------- Íconos
const fav = readFileSync(resolve(root, 'public/favicon.svg'));
await sharp(fav, { density: 1200 }).resize(180, 180).flatten({ background: '#f7f6f3' }).png().toFile(resolve(root, 'public/apple-touch-icon.png'));
for (const s of [192, 512]) await sharp(fav, { density: 1200 }).resize(s, s).png().toFile(join(out, `icon-${s}.png`));

// ---------- Open Graph 1200x630
const { ultrasoundHero } = await import(pathToFileURL(resolve(root, 'src/lib/visuals.js')).href);
const hero = ultrasoundHero().replace('<svg ', '<svg x="640" y="80" width="520" height="470" ');
const logo = readFileSync(resolve(root, 'public/img/logo/mp-studio.svg'), 'utf8').replace('<svg ', '<svg x="72" y="64" width="96" height="117" ');
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#fafafa"/>
<rect x="0" y="0" width="1200" height="630" fill="url(#g)"/>
<defs><radialGradient id="g" cx=".85" cy=".2" r=".6"><stop offset="0" stop-color="#777777" stop-opacity=".14"/><stop offset="1" stop-color="#777777" stop-opacity="0"/></radialGradient></defs>
${logo}
<text x="72" y="236" font-family="Manrope, Segoe UI, Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="3" fill="#5a5a5a">KINESIOLOGÍA EN MENDOZA</text>
<text font-family="Manrope, Segoe UI, Arial, sans-serif" font-size="60" font-weight="800" fill="#1c1e21"><tspan x="72" y="318">Fisioterapia</tspan><tspan x="72" y="388">Invasiva</tspan><tspan x="72" y="458" fill="#3a3a3a">Ecoguiada</tspan></text>
<text x="72" y="530" font-family="Manrope, Segoe UI, Arial, sans-serif" font-size="24" font-weight="600" fill="#61666c">EPI, neuromodulación, MEP y punción seca</text>
<rect x="620" y="60" width="560" height="510" rx="32" fill="#151719"/>
${hero}
</svg>`;
await sharp(Buffer.from(og)).jpeg({ quality: 84, mozjpeg: true }).toFile(join(out, 'og-default.jpg'));

// ---------- Fotos
const srcDir = resolve(root, 'src/images');
const manifestPath = join(out, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const WIDTHS = [480, 960, 1440];
if (existsSync(srcDir)) {
  for (const f of readdirSync(srcDir).filter((x) => /\.(jpe?g|png|webp)$/i.test(x))) {
    const { name } = parse(f);
    const img = sharp(join(srcDir, f)).rotate();
    const meta = await img.metadata();
    const widths = WIDTHS.filter((w) => w <= meta.width);
    if (!widths.length) widths.push(meta.width);
    for (const w of widths) {
      const base = img.clone().resize({ width: w, withoutEnlargement: true });
      await base.clone().avif({ quality: 52 }).toFile(join(out, `${name}-${w}.avif`));
      await base.clone().webp({ quality: 74 }).toFile(join(out, `${name}-${w}.webp`));
      await base.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(join(out, `${name}-${w}.jpg`));
    }
    manifest[name] = { width: meta.width, height: meta.height, widths };
    console.log(`✓ ${f} → ${widths.join(', ')} px (avif/webp/jpg)`);
  }
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('✓ Íconos y og-default.jpg generados');
