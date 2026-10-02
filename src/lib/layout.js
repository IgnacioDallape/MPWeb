import { config, esc, abs, tokens, waLink, known, isPending } from './site.js';
import { icon } from './icons.js';
import { graph, organization, person, website } from './schema.js';

export const NAV = [
  { label: 'Inicio', path: '/', mobileOnly: true },
  { label: 'Fisioterapia invasiva', path: '/fisioterapia-invasiva-ecoguiada/' },
  { label: 'Tratamientos', path: '/tratamientos/' },
  { label: 'Patologías', path: '/lesiones/' },
  { label: 'Metodología', path: '/sobre-mi/' },
  { label: 'Preguntas frecuentes', path: '/preguntas-frecuentes/' },
  { label: 'Contacto', path: '/contacto/' },
  { label: 'Blog', path: '/blog/' },
];

export const brandMark = (cls = 'brand-mark') => `<svg class="${cls}" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><rect width="40" height="40" rx="11" fill="#2a2d31"/><path d="M8.5 15.5a16 16 0 0 1 23 0L25 31h-10z" fill="#7a8087" opacity=".28"/><path d="M8.5 15.5a16 16 0 0 1 23 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M12 24c2.7-1.3 5.3-1.3 8 0s5.3 1.3 8 0" fill="none" stroke="#c9ccd0" stroke-width="1.6" stroke-linecap="round"/><path d="m27.5 9-8 17" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><circle cx="19.5" cy="26" r="1.8" fill="#d6d9dc"/></svg>`;

const brandName = () => (known(config.business.name) ? config.business.name : config.professional.name);

function navList(current) {
  return NAV.map((n) => {
    const active = current === n.path ? 'page' : n.path !== '/' && current.startsWith(n.path) ? 'true' : '';
    return `<li${n.mobileOnly ? ' class="m-only"' : ''}><a href="${n.path}"${active ? ` aria-current="${active}"` : ''}>${n.label}</a></li>`;
  }).join('');
}

function header(current, waMessage) {
  return `<header class="site-header"><div class="container header-inner">
<a class="brand" href="/">${brandMark()}<span class="brand-text"><span class="brand-name">${esc(brandName())}</span><span class="brand-sub">Fisioterapia invasiva ecoguiada</span></span></a>
<nav class="nav-desktop" aria-label="Principal"><ul class="nav-list">${navList(current)}</ul></nav>
<a class="btn btn-primary btn-sm header-cta" href="${esc(waLink(waMessage))}">${icon('whatsapp', { size: 18 })}Solicitar evaluación</a>
<details class="nav-toggle"><summary aria-label="Abrir menú">${icon('menu', { cls: 'icon i-menu' })}${icon('close', { cls: 'icon i-close' })}</summary>
<nav class="nav-panel" aria-label="Principal (móvil)"><ul class="nav-list">${navList(current)}</ul><a class="btn btn-primary" href="${esc(waLink(waMessage))}">${icon('whatsapp', { size: 20 })}Solicitar evaluación</a></nav></details>
</div></header>`;
}

function footer(treatments, featuredLesions) {
  const b = config.business;
  const c = config.contact;
  const p = config.professional;
  const ig = known(c.instagram);
  const year = new Date().getFullYear();
  return `<footer class="site-footer"><div class="container">
<div class="footer-grid">
  <div class="footer-brand">
    <a class="brand" href="/">${brandMark()}<span class="brand-text"><span class="brand-name">${esc(brandName())}</span></span></a>
    <p>${esc(p.name)} · ${esc(p.title)}<br>Kinesiología especializada en <strong>fisioterapia invasiva ecoguiada</strong> y rehabilitación musculoesquelética.<br>Matrícula: ${esc(p.license)}</p>
    <address class="footer-nap">
      <span>${icon('pin')}<span>${esc(b.address)}, ${esc(b.city)}, ${esc(b.province)}</span></span>
      <span>${icon('whatsapp')}<a href="${esc(waLink())}">${esc(c.phoneDisplay)}</a></span>
      <span>${icon('clock')}<span>${esc(config.hoursText)}</span></span>
      <span>${icon('instagram')}${ig ? `<a href="${esc(ig)}" rel="noopener" target="_blank">Instagram</a>` : `<span>${esc(c.instagram)}</span>`}</span>
    </address>
  </div>
  <nav aria-label="Tratamientos"><h2>Tratamientos</h2><ul>
    <li><a href="/fisioterapia-invasiva-ecoguiada/">Fisioterapia invasiva ecoguiada</a></li>
    ${treatments.map((t) => `<li><a href="/tratamientos/${t.slug}/">${esc(t.name)}</a></li>`).join('')}
  </ul></nav>
  <nav aria-label="Lesiones frecuentes"><h2>Lesiones</h2><ul>
    ${featuredLesions.map((l) => `<li><a href="/lesiones/${l.slug}/">${esc(l.name)}</a></li>`).join('')}
    <li><a href="/lesiones/">Ver todas las lesiones</a></li>
  </ul></nav>
  <nav aria-label="Sitio"><h2>Información</h2><ul>
    <li><a href="/sobre-mi/">Sobre mí</a></li>
    <li><a href="/preguntas-frecuentes/">Preguntas frecuentes</a></li>
    <li><a href="/blog/">Blog</a></li>
    <li><a href="/contacto/">Contacto y turnos</a></li>
  </ul></nav>
</div>
<div class="footer-bottom">
  <p>© ${year} ${esc(brandName())}. La información de este sitio es educativa y no reemplaza una consulta profesional.</p>
  <ul><li><a href="/aviso-legal/">Aviso legal</a></li><li><a href="/politica-de-privacidad/">Política de privacidad</a></li></ul>
</div>
</div></footer>`;
}

function conversionBar(waMessage) {
  const href = esc(waLink(waMessage));
  return `<div class="mobile-bar" role="region" aria-label="Contacto rápido">
<a class="btn btn-ghost" href="${href}">${icon('whatsapp', { size: 20 })}WhatsApp</a>
<a class="btn btn-primary" href="/contacto/#turno">${icon('calendar', { size: 20 })}Solicitar turno</a>
</div>
<a class="wa-float" href="${href}">${icon('whatsapp', { size: 22 })}Consultar por WhatsApp</a>`;
}

// Resalta visualmente los datos pendientes ([CIUDAD], [MATRÍCULA]…) solo en nodos de texto.
function highlightPending(html) {
  return html
    .split(/(<script[\s\S]*?<\/script>|<[^>]+>)/g)
    .map((part) => (part.startsWith('<') ? part : part.replace(/\[[A-ZÁÉÍÓÚÑ0-9 /().,-]{3,}\]/g, (m) => `<span class="pending">${m}</span>`)))
    .join('');
}

export function renderPage(page, ctx) {
  const {
    path,
    title,
    description,
    main,
    schema = [],
    ogType = 'website',
    ogImage = '/img/og-default.jpg',
    noindex = false,
    waMessage,
    preload = [],
    scripts = '',
    published,
    updated,
  } = page;

  const t = tokens(title);
  const d = tokens(description);
  const canonical = abs(path);
  const nodes = [organization(), person(), website(), ...schema];

  const body = highlightPending(
    `<a class="skip" href="#contenido">Saltar al contenido</a>
${header(path, waMessage)}
<main id="contenido">${tokens(main)}</main>
${footer(ctx.treatments, ctx.featuredLesions)}
${conversionBar(waMessage)}`
  );

  const ga = known(config.gaId)
    ? `<script>(function(){var l=false;function g(){if(l)return;l=true;var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${config.gaId}';document.head.appendChild(s);window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${config.gaId}');}['scroll','pointerdown','keydown'].forEach(function(e){addEventListener(e,g,{once:true,passive:true})});setTimeout(g,6000)})();</script>`
    : '';

  return `<!doctype html>
<html lang="${config.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(t)}</title>
<meta name="description" content="${esc(d)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1'}">
<link rel="preload" href="/fonts/manrope-latin-wght.woff2" as="font" type="font/woff2" crossorigin>
${preload.join('\n')}
<meta name="theme-color" content="#2a2d31">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="${ogType}">
<meta property="og:locale" content="${config.locale}">
<meta property="og:site_name" content="${esc(brandName())}">
<meta property="og:title" content="${esc(t)}">
<meta property="og:description" content="${esc(d)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${abs(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Fisioterapia invasiva ecoguiada: aguja guiada por ecografía sobre un tendón">
${published ? `<meta property="article:published_time" content="${published}">` : ''}
${updated ? `<meta property="article:modified_time" content="${updated}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(t)}">
<meta name="twitter:description" content="${esc(d)}">
<meta name="twitter:image" content="${abs(ogImage)}">
${known(config.business.geo?.lat) ? `<meta name="geo.position" content="${config.business.geo.lat};${config.business.geo.lng}">` : ''}
${!isPending(config.business.city) ? `<meta name="geo.placename" content="${esc(config.business.city)}">` : ''}
<meta name="geo.region" content="${config.business.country}">
<style>${ctx.css}</style>
${tokens(graph(nodes))}
</head>
<body>
${body}
${main.includes('data-toc') ? `<script>if(matchMedia("(min-width:1060px)").matches)document.querySelectorAll("[data-toc]").forEach(function(d){d.open=true})</script>` : ''}
${scripts}
${ga}
</body>
</html>`;
}
