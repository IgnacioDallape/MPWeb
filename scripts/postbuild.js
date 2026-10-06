// Integración de Astro que corre al terminar el build:
//  1. reemplaza tokens editoriales remanentes ({{CIUDAD}}…),
//  2. resalta los datos pendientes ([CIUDAD], [MATRÍCULA]…) solo en nodos de texto,
//  3. genera sitemap.xml y robots.txt,
//  4. valida SEO técnico (H1 único, títulos/descripciones duplicados, enlaces rotos, alt).
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync, rmSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, tokens, abs, pendingReport } from '../src/lib/site.js';

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith('.html') ? [join(d, f)] : []));

function highlightPending(html) {
  const start = html.indexOf('<body');
  const head = html.slice(0, start);
  const body = html
    .slice(start)
    .split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>)/g)
    .map((part) => (part.startsWith('<') ? part : part.replace(/\[[A-ZÁÉÍÓÚÑ0-9 /().,:-]{3,}[^\]]*\]/g, (m) => `<span class="pending">${m}</span>`)))
    .join('');
  return head + body;
}

const PRIORITY = (p) => (p === '/' ? '1.0' : /^\/(fisioterapia-invasiva-ecoguiada|tratamientos|lesiones)\/$/.test(p) ? '0.9' : p.startsWith('/tratamientos/') ? '0.9' : p.startsWith('/lesiones/') ? '0.8' : p.startsWith('/blog/') && p !== '/blog/' ? '0.6' : '0.7');

export default function postbuild() {
  return {
    name: 'seo-postbuild',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        // El estudio de renders es una herramienta interna: no se publica.
        rmSync(join(out, 'render-lab'), { recursive: true, force: true });
        const files = walk(out);
        const pages = [];
        const errors = [];
        const warns = [];

        for (const file of files) {
          let html = tokens(readFileSync(file, 'utf8'));
          html = highlightPending(html);
          writeFileSync(file, html);
          const rel = '/' + relative(out, file).split(sep).join('/');
          const path = rel.endsWith('/index.html') ? rel.replace(/index\.html$/, '') : rel;
          pages.push({
            path,
            html,
            title: html.match(/<title>([^<]*)<\/title>/)?.[1] || '',
            desc: html.match(/<meta name="description" content="([^"]*)"/)?.[1] || '',
            noindex: /<meta name="robots" content="noindex/.test(html),
            lastmod: html.match(/article:modified_time" content="([^"]+)"/)?.[1] || config.launchDate,
          });
        }

        const known = new Set(pages.map((p) => p.path));
        const seenT = new Map();
        const seenD = new Map();
        for (const p of pages) {
          const h1 = (p.html.match(/<h1[\s>]/g) || []).length;
          if (h1 !== 1) errors.push(`${p.path}: ${h1} H1`);
          if (p.noindex) continue;
          if (seenT.has(p.title)) errors.push(`Title duplicado en ${p.path} y ${seenT.get(p.title)}`);
          if (seenD.has(p.desc)) errors.push(`Description duplicada en ${p.path} y ${seenD.get(p.desc)}`);
          seenT.set(p.title, p.path);
          seenD.set(p.desc, p.path);
          for (const m of p.html.matchAll(/href="(\/[^"#?]*)(?:[#?][^"]*)?"/g)) {
            const href = m[1];
            if (/\.[a-z0-9]+$/i.test(href) && !href.endsWith('.html')) {
              if (!existsSync(join(out, href))) errors.push(`${p.path}: asset inexistente ${href}`);
            } else if (!known.has(href)) errors.push(`${p.path}: enlace roto ${href}`);
          }
          for (const m of p.html.matchAll(/<img\b[^>]*>/g)) if (!/\balt="/.test(m[0])) errors.push(`${p.path}: imagen sin alt`);
        }

        const indexable = pages.filter((p) => !p.noindex && p.path !== '/404.html').sort((a, b) => a.path.localeCompare(b.path));
        writeFileSync(
          join(out, 'sitemap.xml'),
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable
            .map((p) => `  <url><loc>${abs(p.path)}</loc><lastmod>${p.lastmod.slice(0, 10)}</lastmod><priority>${PRIORITY(p.path)}</priority></url>`)
            .join('\n')}\n</urlset>\n`
        );
        writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`);

        logger.info(`${pages.length} páginas · ${indexable.length} URLs en sitemap.xml`);
        const pend = pendingReport();
        if (pend.length) logger.warn(`Datos pendientes en site.config.js (${pend.length}): ${pend.join(', ')}`);
        warns.forEach((w) => logger.warn(w));
        if (errors.length) {
          errors.forEach((e) => logger.error(e));
          throw new Error(`Validación SEO: ${errors.length} error(es)`);
        }
      },
    },
  };
}
