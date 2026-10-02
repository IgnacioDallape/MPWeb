// Plantilla de detalle compartida por tratamientos, lesiones y artículos.
import { esc, abs, formatDate, config } from '../lib/site.js';
import { markdown, wordCount } from '../lib/md.js';
import { icon } from '../lib/icons.js';
import { pageHero, ctaButtons, ctaInline, ctaBand, faqSection, tocBlock, asideCta, reviewedBox, card, relatedSection } from '../lib/components.js';
import * as S from '../lib/schema.js';

export const CATEGORIES = {
  tendinosas: { label: 'Lesiones tendinosas', icon: 'tendon', intro: 'Tendón de Aquiles, rotuliano, manguito rotador, epicondilitis, epitrocleitis y otras tendinopatías.' },
  fascia: { label: 'Fascia plantar', icon: 'foot', intro: 'Dolor en el talón y la planta del pie, especialmente en los primeros pasos.' },
  musculares: { label: 'Lesiones musculares', icon: 'muscle', intro: 'Desgarros, dolor miofascial y fibrosis tras lesiones previas.' },
  ligamentarias: { label: 'Lesiones ligamentarias', icon: 'joint', intro: 'Esguinces y lesiones de ligamentos con dolor o inestabilidad persistente.' },
  bursas: { label: 'Bursopatías', icon: 'layers', intro: 'Bursitis de cadera, hombro, rodilla, codo y talón.' },
  dolor: { label: 'Dolor musculoesquelético persistente', icon: 'pulse', intro: 'Dolor que se mantiene en el tiempo y necesita un abordaje integral.' },
};

export const treatmentCard = (t) =>
  card({ href: `/tratamientos/${t.slug}/`, title: t.name, text: t.cardText, iconName: t.icon, tag: t.shortName, more: 'Conocer el tratamiento' });
export const lesionCard = (l) =>
  card({ href: `/lesiones/${l.slug}/`, title: l.name, text: l.cardText, iconName: l.icon, tag: CATEGORIES[l.category]?.label, more: 'Ver tratamiento' });
export const postCard = (p) =>
  card({ href: `/blog/${p.slug}/`, title: p.h1, text: p.description, tag: p.category, more: 'Leer artículo' });

function renderBody(item) {
  const { html, toc } = markdown(item.body);
  const body = html.replace(/<p>\{\{CTA\}\}<\/p>/g, ctaInline({ waMessage: item.waMessage }));
  return { body, toc };
}

export function detailPage(item, kind, ctx) {
  const path = `/${kind}/${item.slug}/`;
  const { body, toc } = renderBody(item);
  const rel = ctx.relatedOf(kind, item.slug);
  const updated = item.updated || item.date;
  const published = item.date || config.launchDate;

  const sectionCrumb = { tratamientos: 'Tratamientos', lesiones: 'Lesiones', blog: 'Blog' }[kind];
  const crumbs = [{ name: 'Inicio', path: '/' }, { name: sectionCrumb, path: `/${kind}/` }, { name: item.shortCrumb || item.name || item.h1, path }];

  const eyebrow =
    kind === 'tratamientos' ? 'Tratamiento ecoguiado' : kind === 'lesiones' ? CATEGORIES[item.category]?.label : item.category;

  const minutes = Math.max(3, Math.round(wordCount(item.body) / 210));
  const meta =
    kind === 'blog'
      ? `<p class="meta-line"><span>${icon('user')}Por <a href="/sobre-mi/">${esc(config.professional.name)}</a></span><span>${icon('calendar')}<time datetime="${published}">${formatDate(published)}</time></span>${
          updated !== published ? `<span>Actualizado: <time datetime="${updated}">${formatDate(updated)}</time></span>` : ''
        }<span>${icon('clock')}${minutes} min de lectura</span></p>`
      : `<p class="meta-line"><span>${icon('shield')}Revisado por ${esc(config.professional.name)} · Mat. ${esc(config.professional.license)}</span><span>${icon('calendar')}Actualizado: <time datetime="${updated}">${formatDate(updated)}</time></span></p>`;

  const actions =
    kind === 'blog'
      ? ''
      : `<div style="margin-top:24px">${ctaButtons({
          waMessage: item.waMessage,
          primary: kind === 'lesiones' ? 'Consultar por mi lesión' : 'Solicitar una evaluación',
          secondary: kind === 'lesiones' ? 'Ver tratamientos' : 'Ver lesiones que aborda',
          secondaryHref: kind === 'lesiones' ? '#tratamientos-relacionados' : '#lesiones-relacionadas',
        })}</div>`;

  const hasFaq = item.faqs?.length;
  const main = `
${pageHero({ crumbs, eyebrow, h1: item.h1, lead: item.lead, meta, facts: item.facts, actions })}
<div class="container article-layout">
  <aside class="article-aside">${tocBlock(toc, hasFaq ? [{ id: 'preguntas-frecuentes', text: 'Preguntas frecuentes' }] : [])}${asideCta(item.waMessage)}</aside>
  <article class="prose">
    ${body}
    ${faqSection(item.faqs)}
    ${reviewedBox(updated, kind === 'blog' ? published : null)}
  </article>
</div>
${relatedBlocks(kind, rel)}
${ctaBand({ waMessage: item.waMessage })}`;

  // ---------- Schema ----------
  const title = item.title;
  const nodes = [S.breadcrumbs(crumbs)];
  if (kind === 'tratamientos') {
    nodes.push(S.procedure(path, item.procedure));
    nodes.push(S.webPage({ path, title: item.h1, description: item.description, updated, published, medical: true, about: { '@id': abs(path + '#procedimiento') } }));
  } else if (kind === 'lesiones') {
    const tPaths = rel.tratamientos.map((t) => `/tratamientos/${t.slug}/`);
    nodes.push(S.condition(path, item.condition, tPaths));
    nodes.push(S.webPage({ path, title: item.h1, description: item.description, updated, published, medical: true, about: { '@id': abs(path + '#condicion') } }));
  } else {
    nodes.push(S.article(path, item, abs('/img/og-default.jpg')));
    nodes.push(S.webPage({ path, title: item.h1, description: item.description, updated, published, medical: true }));
  }
  if (hasFaq) nodes.push(S.faqPage(path, item.faqs));

  return {
    path,
    title,
    description: item.description,
    main,
    schema: nodes,
    ogType: kind === 'blog' ? 'article' : 'website',
    waMessage: item.waMessage || (kind === 'blog' ? `Hola, leí el artículo "${item.h1}" y quería hacer una consulta.` : undefined),
    published: kind === 'blog' ? published : undefined,
    updated,
    lastmod: updated,
  };
}

function relatedBlocks(kind, rel) {
  const blocks = [];
  if (kind === 'tratamientos') {
    blocks.push(relatedSection({ id: 'lesiones-relacionadas', title: 'Lesiones en las que suele indicarse', intro: 'La indicación siempre depende de la evaluación individual.', items: rel.lesiones.map(lesionCard) }));
    blocks.push(relatedSection({ id: 'tratamientos-relacionados', title: 'Otras técnicas de fisioterapia invasiva ecoguiada', items: rel.tratamientos.map(treatmentCard), cols: 3 }));
    blocks.push(relatedSection({ id: 'articulos-relacionados', title: 'Para profundizar', items: rel.blog.map(postCard) }));
  } else if (kind === 'lesiones') {
    blocks.push(relatedSection({ id: 'tratamientos-relacionados', title: 'Técnicas que pueden formar parte del tratamiento', intro: 'Se combinan con ejercicio terapéutico y progresión de cargas cuando la evaluación lo indica.', items: rel.tratamientos.map(treatmentCard) }));
    blocks.push(relatedSection({ id: 'lesiones-relacionadas', title: 'Lesiones relacionadas', items: rel.lesiones.map(lesionCard) }));
    blocks.push(relatedSection({ id: 'articulos-relacionados', title: 'Artículos sobre esta lesión', items: rel.blog.map(postCard) }));
  } else {
    blocks.push(relatedSection({ id: 'lesiones-relacionadas', title: 'Lesiones relacionadas', items: rel.lesiones.map(lesionCard) }));
    blocks.push(relatedSection({ id: 'tratamientos-relacionados', title: 'Tratamientos mencionados', items: rel.tratamientos.map(treatmentCard) }));
    blocks.push(relatedSection({ id: 'articulos-relacionados', title: 'Seguí leyendo', items: rel.blog.map(postCard) }));
  }
  return blocks.join('');
}
