// Generador estático sin dependencias de runtime.
// node scripts/build.js  →  dist/ listo para subir a cualquier hosting estático.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, cpSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const bust = `?v=${Date.now()}`; // evita caché de módulos en modo dev

const imp = async (p) => (await import(pathToFileURL(p).href + bust)).default;
const mod = async (p) => import(pathToFileURL(resolve(root, p)).href + bust);

const { config, tokens, abs, pendingReport } = await mod('src/lib/site.js');
const { renderPage } = await mod('src/lib/layout.js');
const { detailPage, CATEGORIES } = await mod('src/templates/detail.js');
const { homePage } = await mod('src/templates/home.js');
const P = await mod('src/templates/pages.js');

const t0 = Date.now();

// ---------------------------------------------------------------- Contenido
async function loadDir(dir) {
  const full = resolve(root, 'src/content', dir);
  const files = readdirSync(full).filter((f) => f.endsWith('.js'));
  const items = [];
  for (const f of files) {
    const item = await imp(join(full, f));
    if (item.slug !== f.replace(/\.js$/, '')) throw new Error(`${dir}/${f}: el slug "${item.slug}" no coincide con el nombre del archivo`);
    if (item.draft) continue;
    items.push(item);
  }
  return items;
}

const catOrder = Object.keys(CATEGORIES);
const treatments = (await loadDir('tratamientos')).sort((a, b) => a.order - b.order);
const lesions = (await loadDir('lesiones')).sort((a, b) => catOrder.indexOf(a.category) - catOrder.indexOf(b.category) || a.order - b.order);
const posts = (await loadDir('blog')).sort((a, b) => b.date.localeCompare(a.date) || 0);
const pillar = await imp(resolve(root, 'src/content/paginas/fisioterapia-invasiva-ecoguiada.js'));

const collections = { tratamientos: treatments, lesiones: lesions, blog: posts };
const bySlug = (kind, slug) => {
  const it = collections[kind].find((x) => x.slug === slug);
  if (!it) throw new Error(`Relación rota: ${kind}/${slug}`);
  return it;
};

// Red semántica bidireccional: declarados + inversos (quién me declara a mí).
const LIMITS = { tratamientos: 4, lesiones: 9, blog: 6 };
function relatedOf(kind, slug) {
  const self = bySlug(kind, slug);
  const out = {};
  for (const target of Object.keys(collections)) {
    const declared = (self.related?.[target] || []).filter((s) => !(target === kind && s === slug));
    const reverse = collections[target].filter((o) => o.slug !== slug && o.related?.[kind]?.includes(slug)).map((o) => o.slug);
    const slugs = [...new Set([...declared, ...reverse])].slice(0, LIMITS[target]);
    out[target] = slugs.map((s) => bySlug(target, s));
  }
  return out;
}

const latest = (list) => list.map((x) => x.updated || x.date).sort().pop() || config.launchDate;

const ctx = {
  treatments,
  lesions,
  posts,
  relatedOf,
  latest,
  post: (s) => bySlug('blog', s),
  featuredLesions: ['tendinopatia-aquiles', 'tendinopatia-rotuliana', 'manguito-rotador', 'epicondilitis', 'fascitis-plantar', 'desgarros-musculares']
    .map((s) => lesions.find((l) => l.slug === s))
    .filter(Boolean),
  homePosts: ['primera-sesion-fisioterapia-invasiva', 'diferencias-entre-epi-y-puncion-seca', 'ecografia-en-fisioterapia'].map((s) => posts.find((p) => p.slug === s)).filter(Boolean),
};

// ---------------------------------------------------------------- CSS
const minifyCss = (css) =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
ctx.css = minifyCss(readFileSync(resolve(root, 'src/styles/site.css'), 'utf8'));

// ---------------------------------------------------------------- Páginas
const pages = [
  homePage(ctx),
  P.pillarPage(pillar, ctx),
  P.treatmentsHub(ctx),
  ...treatments.map((t) => ({ ...detailPage(t, 'tratamientos', ctx), priority: '0.9' })),
  P.lesionsHub(ctx),
  ...lesions.map((l) => ({ ...detailPage(l, 'lesiones', ctx), priority: '0.8' })),
  P.blogHub(ctx),
  ...posts.map((p) => ({ ...detailPage(p, 'blog', ctx), priority: '0.6' })),
  P.faqPage(ctx, pillar),
  P.aboutPage(ctx),
  P.contactPage(ctx),
  ...P.legalPages(),
  P.notFoundPage(ctx),
];

const minifyHtml = (html) => html.replace(/\n\s+/g, '\n').replace(/\n{2,}/g, '\n').replace(/>\n</g, '><');

// Vaciar dist/ con reintentos (OneDrive/antivirus pueden bloquear archivos un instante en Windows).
mkdirSync(dist, { recursive: true });
for (const entry of readdirSync(dist)) rmSync(join(dist, entry), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });

const outputs = [];
for (const page of pages) {
  const html = minifyHtml(renderPage(page, ctx));
  const file = page.path.endsWith('.html') ? join(dist, page.path) : join(dist, page.path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  outputs.push({ page, html, file });
}

// ---------------------------------------------------------------- Assets
if (existsSync(resolve(root, 'public'))) cpSync(resolve(root, 'public'), dist, { recursive: true });
mkdirSync(join(dist, 'fonts'), { recursive: true });
cpSync(resolve(root, 'node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2'), join(dist, 'fonts/manrope-latin-wght.woff2'));

// ---------------------------------------------------------------- sitemap.xml + robots.txt
const indexable = pages.filter((p) => !p.noindex && p.sitemap !== false);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable
  .map((p) => `  <url><loc>${abs(p.path)}</loc><lastmod>${p.lastmod || config.launchDate}</lastmod>${p.priority ? `<priority>${p.priority}</priority>` : ''}</url>`)
  .join('\n')}
</urlset>
`;
writeFileSync(join(dist, 'sitemap.xml'), sitemap);
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`);

// ---------------------------------------------------------------- Validaciones
const errors = [];
const warns = [];
const known = new Set(outputs.map((o) => o.page.path));
const inbound = new Map([...known].map((p) => [p, 0]));
const titles = new Map();
const descs = new Map();

for (const { page, html } of outputs) {
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) errors.push(`${page.path}: tiene ${h1} H1`);

  const title = tokens(page.title);
  const desc = tokens(page.description);
  if (titles.has(title)) errors.push(`Title duplicado: "${title}" (${page.path} y ${titles.get(title)})`);
  titles.set(title, page.path);
  if (descs.has(desc)) errors.push(`Description duplicada en ${page.path} y ${descs.get(desc)}`);
  descs.set(desc, page.path);
  if (!page.noindex) {
    if (desc.length < 110 || desc.length > 165) warns.push(`${page.path}: description de ${desc.length} caracteres`);
    // Con los datos reales cargados, el title debería quedar en ~50–65 caracteres.
    if (title.length > 75) warns.push(`${page.path}: title de ${title.length} caracteres`);
  }

  const mainHtml = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  for (const m of html.matchAll(/href="(\/[^"#?]*)(?:[#?][^"]*)?"/g)) {
    const href = m[1];
    const isAsset = /\.[a-z0-9]+$/i.test(href) && !href.endsWith('.html');
    if (isAsset) {
      if (!existsSync(join(dist, href))) errors.push(`${page.path}: asset inexistente ${href}`);
      continue;
    }
    if (!known.has(href)) errors.push(`${page.path}: enlace roto ${href}`);
  }
  for (const m of mainHtml.matchAll(/href="(\/[^"#?]*)/g)) {
    if (m[1] !== page.path && inbound.has(m[1])) inbound.set(m[1], inbound.get(m[1]) + 1);
  }
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt="/.test(m[0])) errors.push(`${page.path}: imagen sin alt`);
}
for (const [path, n] of inbound) if (n === 0 && !['/', '/404.html', '/aviso-legal/', '/politica-de-privacidad/'].includes(path)) warns.push(`Página huérfana (sin enlaces contextuales entrantes): ${path}`);

// ---------------------------------------------------------------- Reporte
const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1);
const sizes = outputs.map((o) => Buffer.byteLength(o.html));
console.log(`\n✓ ${outputs.length} páginas generadas en ${Date.now() - t0} ms → dist/`);
console.log(`  ${indexable.length} URLs en sitemap.xml · CSS inline ${kb(ctx.css)} KB · HTML promedio ${(sizes.reduce((a, b) => a + b, 0) / sizes.length / 1024).toFixed(1)} KB (máx ${(Math.max(...sizes) / 1024).toFixed(1)} KB)`);
const pend = pendingReport();
if (pend.length) console.log(`\n⚠ Datos pendientes en site.config.js (${pend.length}):\n  - ${pend.join('\n  - ')}`);
if (warns.length) console.log(`\nAvisos (${warns.length}):\n  - ${warns.join('\n  - ')}`);
if (errors.length) {
  console.error(`\n✗ Errores (${errors.length}):\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
