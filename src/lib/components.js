import { config, esc, waLink, formatDate } from './site.js';
import { icon } from './icons.js';
import { inline, markdown } from './md.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Imágenes responsive generadas por `npm run images` (AVIF + WebP + JPG, width/height explícitos → sin CLS).
const manifestPath = resolve(import.meta.dirname, '../../public/img/manifest.json');
const IMAGES = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

export const imagePath = (name) => (IMAGES[name] ? `/img/${name}-${IMAGES[name].widths.at(-1)}.jpg` : undefined);

export function picture(name, alt, { sizes = '(min-width: 960px) 50vw, 100vw', priority = false, cls = '' } = {}) {
  const img = IMAGES[name];
  if (!img) return '';
  const set = (ext) => img.widths.map((w) => `/img/${name}-${w}.${ext} ${w}w`).join(', ');
  const largest = img.widths[img.widths.length - 1];
  const height = Math.round((img.height / img.width) * largest);
  return `<picture${cls ? ` class="${cls}"` : ''}><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img src="/img/${name}-${largest}.jpg" srcset="${set('jpg')}" sizes="${sizes}" width="${largest}" height="${height}" alt="${esc(alt)}" ${priority ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`;
}

export function breadcrumbsNav(items) {
  return `<nav class="crumbs" aria-label="Ruta de navegación"><ol>${items
    .map((it, i) =>
      i === items.length - 1 ? `<li><span aria-current="page">${esc(it.name)}</span></li>` : `<li><a href="${it.path}">${esc(it.name)}</a></li>`
    )
    .join('')}</ol></nav>`;
}

export function pageHero({ crumbs, eyebrow, h1, lead, meta = '', facts, actions = '' }) {
  return `<section class="page-hero"><div class="container">
${breadcrumbsNav(crumbs)}
${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
<h1>${esc(h1)}</h1>
${lead ? `<p class="lead">${inline(lead)}</p>` : ''}
${actions}
${meta}
${facts ? factsList(facts) : ''}
</div></section>`;
}

export function factsList(facts) {
  return `<dl class="facts">${facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>`;
}

export function ctaButtons({ waMessage, primary = 'Solicitar una evaluación', secondary, secondaryHref } = {}) {
  return `<div class="btn-row">
<a class="btn btn-primary" href="${esc(waLink(waMessage))}">${icon('whatsapp', { size: 20 })}${esc(primary)}</a>
${secondary ? `<a class="btn btn-ghost" href="${secondaryHref}">${esc(secondary)}${icon('arrow', { size: 18 })}</a>` : ''}
</div>`;
}

export function ctaInline({ waMessage, title = '¿Querés saber si este abordaje es adecuado para tu caso?', text = 'El primer paso es una evaluación: historia clínica, exploración y ecografía para entender qué estructura está implicada.', button = 'Consultar por mi lesión' } = {}) {
  return `<aside class="cta-inline" aria-label="Solicitar evaluación"><p><strong>${esc(title)}</strong>${esc(text)}</p><a class="btn btn-primary" href="${esc(waLink(waMessage))}">${icon('whatsapp', { size: 20 })}${esc(button)}</a></aside>`;
}

export function ctaBand({ waMessage, title = 'Primero, una evaluación. Después, el plan.', text = 'Cada tratamiento comienza con una valoración clínica y ecográfica. Si una técnica invasiva no es la mejor opción para tu caso, te lo vamos a decir.', heading = 'h2' } = {}) {
  return `<section class="section" aria-labelledby="cta-final"><div class="container"><div class="cta-band">
<p class="eyebrow" style="color:#7fe0d6">Turnos en {{CIUDAD}}</p>
<${heading} id="cta-final">${esc(title)}</${heading}>
<p>${esc(text)}</p>
<div class="btn-row"><a class="btn btn-light" href="${esc(waLink(waMessage))}">${icon('whatsapp', { size: 20 })}Hablar por WhatsApp</a><a class="btn btn-ghost" href="/contacto/">Reservar turno${icon('arrow', { size: 18 })}</a></div>
</div></div></section>`;
}

export function faqList(faqs, { headingTag = 'h3' } = {}) {
  return `<div class="faq">${faqs
    .map(
      (f, i) =>
        `<details${i === 0 ? ' open' : ''}><summary><${headingTag}>${esc(f.q)}</${headingTag}></summary><div class="answer">${markdown(f.a).html}</div></details>`
    )
    .join('')}</div>`;
}

export function faqSection(faqs, { title = 'Preguntas frecuentes', id = 'preguntas-frecuentes' } = {}) {
  if (!faqs?.length) return '';
  return `<section aria-labelledby="${id}"><h2 id="${id}">${esc(title)}</h2>${faqList(faqs)}</section>`;
}

export function tocBlock(toc, extra = []) {
  const items = [...toc, ...extra];
  if (items.length < 3) return '';
  return `<details class="toc" data-toc><summary>En esta página</summary><nav aria-label="Contenido de la página"><ol>${items
    .map((t) => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`)
    .join('')}</ol></nav></details>`;
}

export function asideCta(waMessage) {
  return `<div class="aside-cta"><strong>Evaluación individual</strong>Antes de cualquier técnica se evalúa tu caso con exploración y ecografía.<a class="btn btn-light btn-sm" href="${esc(waLink(waMessage))}">${icon('whatsapp', { size: 18 })}Consultar por WhatsApp</a></div>`;
}

export function reviewedBox(updated, published) {
  const p = config.professional;
  return `<div class="reviewed">${icon('shield')}<p>Contenido revisado por <strong>${esc(p.name)}</strong>, ${esc(p.role)}, matrícula ${esc(p.license)}. ${
    published ? `Publicado el <time datetime="${published}">${formatDate(published)}</time>. ` : ''
  }Última actualización: <time datetime="${updated}">${formatDate(updated)}</time>. <a href="/sobre-mi/">Conocé la formación del profesional</a>.</p></div>
<p class="disclaimer">Esta información es educativa y no reemplaza una consulta. Ante dolor intenso, fiebre, pérdida de fuerza súbita, traumatismo importante o síntomas que empeoran, consultá con un médico.</p>`;
}

export function card({ href, title, text, iconName, tag, feature = false, more = 'Ver más', headingTag = 'h3' }) {
  return `<article class="card card-link${feature ? ' card-feature' : ''}">
${iconName ? `<span class="card-icon">${icon(iconName)}</span>` : ''}
${tag ? `<span class="tag">${esc(tag)}</span>` : ''}
<${headingTag}><a href="${href}">${esc(title)}</a></${headingTag}>
<p>${esc(text)}</p>
<span class="more" aria-hidden="true">${esc(more)}${icon('arrow', { size: 16 })}</span>
</article>`;
}

export function relatedSection({ id, title, intro, items, cols = 3 }) {
  if (!items.length) return '';
  return `<section class="related" aria-labelledby="${id}"><div class="container">
<h2 id="${id}">${esc(title)}</h2>${intro ? `<p class="muted">${esc(intro)}</p>` : ''}
<div class="grid grid-${cols}">${items.join('')}</div></div></section>`;
}
