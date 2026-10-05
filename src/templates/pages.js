import { config, esc, waLink, known, abs, hasWhatsapp, formatDate } from '../lib/site.js';
import { icon } from '../lib/icons.js';
import { markdown, inline } from '../lib/md.js';
import { certStrip, picture, pageHero, ctaButtons, ctaInline, ctaBand, faqList, faqSection, tocBlock, asideCta, reviewedBox, relatedSection } from '../lib/components.js';
import { CATEGORIES, treatmentCard, lesionCard, postCard } from './detail.js';
import { layersFigure } from '../lib/visuals.js';
import { HOME_FAQS } from './home.js';
import * as S from '../lib/schema.js';

const HOME = { name: 'Inicio', path: '/' };

// ---------------------------------------------------------------- Pilar
export function pillarPage(pillar, ctx) {
  const path = pillar.path;
  const crumbs = [HOME, { name: 'Fisioterapia invasiva ecoguiada', path }];
  const { html, toc } = markdown(pillar.body);
  const body = html.replace(/<p>\{\{CTA\}\}<\/p>/g, ctaInline({ waMessage: pillar.waMessage }));
  const main = `
${pageHero({
  crumbs,
  eyebrow: 'Especialidad',
  h1: pillar.h1,
  lead: pillar.lead,
  actions: `<div style="margin-top:24px">${ctaButtons({ waMessage: pillar.waMessage, primary: 'Solicitar una evaluación', secondary: 'Ver tratamientos', secondaryHref: '#tratamientos-relacionados' })}</div>`,
  meta: `<p class="meta-line"><span>${icon('shield')}Revisado por ${esc(config.professional.name)} · Mat. ${esc(config.professional.license)}</span><span>${icon('calendar')}Actualizado: <time datetime="${pillar.updated}">${formatDate(pillar.updated)}</time></span></p>`,
  facts: pillar.facts,
})}
<div class="container article-layout">
  <aside class="article-aside">${tocBlock(toc, [{ id: 'preguntas-frecuentes', text: 'Preguntas frecuentes' }])}${asideCta(pillar.waMessage)}</aside>
  <article class="prose">
    <figure class="figure" style="margin:0 0 2em">${layersFigure()}<figcaption>Esquema: la sonda ecográfica permite seguir la aguja hasta la estructura objetivo.</figcaption></figure>
    ${body}
    ${faqSection(pillar.faqs)}
    ${reviewedBox(pillar.updated)}
  </article>
</div>
${relatedSection({ id: 'tratamientos-relacionados', title: 'Tratamientos de fisioterapia invasiva', items: ctx.treatments.map(treatmentCard), cols: 4 })}
${relatedSection({ id: 'articulos-relacionados', title: 'Artículos recomendados', items: ['primera-sesion-fisioterapia-invasiva', 'ecografia-en-fisioterapia', 'cuando-se-recomienda-fisioterapia-invasiva'].map((s) => postCard(ctx.post(s))) })}
${ctaBand({ waMessage: pillar.waMessage })}`;

  return {
    path,
    title: pillar.title,
    description: pillar.description,
    main,
    waMessage: pillar.waMessage,
    schema: [
      S.breadcrumbs(crumbs),
      S.webPage({
        path,
        title: pillar.h1,
        description: pillar.description,
        updated: pillar.updated,
        published: config.launchDate,
        medical: true,
        about: { '@type': 'MedicalTherapy', name: 'Fisioterapia invasiva ecoguiada', alternateName: ['Kinesiología invasiva ecoguiada', 'Fisioterapia ecoguiada'] },
        extra: { hasPart: ctx.treatments.map((t) => ({ '@id': abs(`/tratamientos/${t.slug}/#procedimiento`) })) },
      }),
      S.faqPage(path, pillar.faqs),
    ],
    lastmod: pillar.updated,
    priority: '0.9',
  };
}

// ---------------------------------------------------------------- Hub tratamientos
export function treatmentsHub(ctx) {
  const path = '/tratamientos/';
  const crumbs = [HOME, { name: 'Tratamientos', path }];
  const rows = [
    ['EPI', 'Corriente galvánica', 'Tejido lesionado (frecuentemente tendón)', 'Molestia intensa y breve al aplicar la corriente', 'Tendinopatías persistentes, fascitis, fibrosis', 'epi-electrolisis-percutanea'],
    ['NMP-e', 'Estimulación eléctrica de baja frecuencia', 'Nervio periférico', 'Contracción muscular o sensación eléctrica', 'Dolor persistente, inhibición muscular', 'neuromodulacion-percutanea-ecoguiada'],
    ['MEP', 'Corriente galvánica en microamperios', 'Tejidos blandos sensibles o superficiales', 'Generalmente bien tolerada', 'Fibrosis, cicatrices, ligamentos, bursas', 'microelectrolisis-percutanea-mep'],
    ['Punción seca', 'Aguja sin corriente ni sustancias', 'Músculo y puntos gatillo', 'Pinchazo y respuesta de espasmo local', 'Dolor miofascial, sobrecargas musculares', 'puncion-seca-ecoguiada'],
  ];
  const main = `
${pageHero({
  crumbs,
  eyebrow: 'Tratamientos ecoguiados',
  h1: 'Tratamientos de fisioterapia invasiva ecoguiada',
  lead: 'EPI, neuromodulación percutánea, microelectrólisis y punción seca: cuatro técnicas con objetivos distintos que comparten dos principios, la **guía ecográfica en tiempo real** y la **integración con el ejercicio terapéutico**.',
  actions: `<div style="margin-top:24px">${ctaButtons({ primary: 'Consultar qué técnica es adecuada para mí', waMessage: 'Hola, quería consultar qué tratamiento podría ser adecuado para mi lesión.' })}</div>`,
})}
<section class="section" aria-labelledby="tecnicas"><div class="container">
  <div class="section-head"><h2 id="tecnicas">Cuatro tratamientos, objetivos diferentes</h2></div>
  <div class="grid grid-4">${ctx.treatments.map(treatmentCard).join('')}</div>
</div></section>
<section class="section section-alt" aria-labelledby="comparativa"><div class="container">
  <div class="section-head"><p class="eyebrow">Comparativa</p><h2 id="comparativa">¿En qué se diferencian las técnicas?</h2>
  <p class="lead">Una guía orientativa. La elección final depende siempre de la evaluación clínica y ecográfica.</p></div>
  <div class="table-wrap"><table>
    <thead><tr><th scope="col">Técnica</th><th scope="col">Qué utiliza</th><th scope="col">Sobre qué actúa</th><th scope="col">Sensación habitual</th><th scope="col">Se utiliza sobre todo en</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><th scope="row"><a href="/tratamientos/${r[5]}/">${r[0]}</a></th><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join('')}</tbody>
  </table></div>
  <p class="muted">¿Dudás entre dos técnicas? Leé <a href="/blog/diferencias-entre-epi-y-puncion-seca/">diferencias entre EPI y punción seca</a> o la guía completa de <a href="/fisioterapia-invasiva-ecoguiada/">fisioterapia invasiva ecoguiada</a>.</p>
</div></section>
<section class="section" aria-labelledby="comun"><div class="container split">
  <div><p class="eyebrow">En todos los casos</p><h2 id="comun">Lo que tienen en común</h2>
  <ul class="checklist">
    <li>${icon('check')}<span><strong>Evaluación previa</strong>: anamnesis, exploración física y ecografía antes de indicar cualquier técnica.</span></li>
    <li>${icon('check')}<span><strong>Guía ecográfica</strong>: se ve la aguja y la estructura durante toda la intervención.</span></li>
    <li>${icon('check')}<span><strong>Material estéril</strong> de un solo uso y protocolos de asepsia.</span></li>
    <li>${icon('check')}<span><strong>Ejercicio terapéutico</strong> y progresión de cargas como parte del plan.</span></li>
    <li>${icon('check')}<span><strong>Reevaluación</strong> de la evolución antes de cada sesión.</span></li>
  </ul>
  <a class="btn btn-ghost" href="/lesiones/">Ver lesiones que se abordan${icon('arrow', { size: 18 })}</a></div>
  <figure class="figure">${layersFigure()}<figcaption>La guía ecográfica es común a todas las técnicas.</figcaption></figure>
</div></section>
${ctaBand({})}`;
  return {
    path,
    title: 'Tratamientos de Fisioterapia Invasiva en {{CIUDAD}}: EPI, NMP, MEP',
    description: 'Compará EPI, neuromodulación percutánea ecoguiada, microelectrólisis (MEP) y punción seca ecoguiada: qué son, en qué se diferencian y cuándo se indican.',
    main,
    schema: [
      S.breadcrumbs(crumbs),
      S.webPage({ path, type: 'CollectionPage', title: 'Tratamientos de fisioterapia invasiva ecoguiada', description: 'Técnicas de fisioterapia invasiva guiadas por ecografía.', updated: config.launchDate }),
      { '@type': 'ItemList', '@id': abs(path + '#lista'), itemListElement: ctx.treatments.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/tratamientos/${t.slug}/`), name: t.name })) },
    ],
    lastmod: ctx.latest(ctx.treatments),
    priority: '0.9',
  };
}

// ---------------------------------------------------------------- Hub lesiones
export function lesionsHub(ctx) {
  const path = '/lesiones/';
  const crumbs = [HOME, { name: 'Lesiones', path }];
  const groups = Object.entries(CATEGORIES)
    .map(([key, cat]) => ({ key, ...cat, items: ctx.lesions.filter((l) => l.category === key) }))
    .filter((g) => g.items.length);
  const main = `
${pageHero({
  crumbs,
  eyebrow: 'Lesiones',
  h1: '¿Qué lesiones puede abordar la fisioterapia invasiva ecoguiada?',
  lead: 'Tendinopatías, lesiones musculares, ligamentarias, fascitis plantar, bursopatías y dolor persistente. Cada página explica la lesión, cómo se evalúa y qué opciones de tratamiento existen.',
  actions: `<div style="margin-top:24px">${ctaButtons({ primary: 'Consultar por mi lesión', waMessage: 'Hola, quería consultar por mi lesión.' })}</div>`,
})}
<div class="container">
${groups
  .map(
    (g) => `<section class="section" style="padding-bottom:0" aria-labelledby="cat-${g.key}">
  <div class="section-head"><h2 id="cat-${g.key}">${esc(g.label)}</h2><p class="muted">${esc(g.intro)}</p></div>
  <div class="grid grid-3">${g.items.map(lesionCard).join('')}</div>
</section>`
  )
  .join('')}
</div>
<section class="section"><div class="container">
  ${ctaInline({ title: '¿No encontrás tu lesión?', text: 'Estas son las consultas más frecuentes, pero no las únicas. Escribinos y te orientamos sobre si una evaluación puede ayudarte.', button: 'Hacer una consulta', waMessage: 'Hola, quería consultar por una lesión que no figura en la web.' })}
</div></section>
${ctaBand({})}`;
  return {
    path,
    title: 'Lesiones que trata la Fisioterapia Invasiva en {{CIUDAD}}',
    description: 'Tendinopatías, desgarros, fascitis plantar, epicondilitis, esguinces, bursitis y dolor persistente: cómo se evalúan y tratan con fisioterapia ecoguiada.',
    main,
    schema: [
      S.breadcrumbs(crumbs),
      S.webPage({ path, type: 'CollectionPage', title: 'Lesiones que aborda la fisioterapia invasiva ecoguiada', description: 'Índice de lesiones musculoesqueléticas.', updated: config.launchDate }),
      { '@type': 'ItemList', '@id': abs(path + '#lista'), itemListElement: ctx.lesions.map((l, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/lesiones/${l.slug}/`), name: l.name })) },
    ],
    lastmod: ctx.latest(ctx.lesions),
    priority: '0.9',
  };
}

// ---------------------------------------------------------------- Hub blog
export function blogHub(ctx) {
  const path = '/blog/';
  const crumbs = [HOME, { name: 'Blog', path }];
  const cats = [...new Set(ctx.posts.map((p) => p.category))];
  const main = `
${pageHero({
  crumbs,
  eyebrow: 'Blog',
  h1: 'Blog de fisioterapia invasiva, lesiones y rehabilitación',
  lead: 'Artículos para entender tu lesión, conocer cómo funcionan las técnicas ecoguiadas y llegar mejor informado a la consulta. Todo el contenido es revisado por un profesional matriculado.',
})}
<div class="container">
${cats
  .map(
    (c) => `<section class="section" style="padding-bottom:0" aria-labelledby="cat-${c.toLowerCase().replace(/\W+/g, '-')}">
  <h2 id="cat-${c.toLowerCase().replace(/\W+/g, '-')}">${esc(c)}</h2>
  <div class="grid grid-3">${ctx.posts.filter((p) => p.category === c).map(postCard).join('')}</div>
</section>`
  )
  .join('')}
</div>
<div style="height:64px"></div>
${ctaBand({})}`;
  return {
    path,
    title: 'Blog de fisioterapia invasiva y lesiones | {{NOMBRE}}',
    description: 'Guías y artículos sobre fisioterapia invasiva ecoguiada, EPI, neuromodulación, punción seca, tendinopatías y rehabilitación, revisados por un kinesiólogo.',
    main,
    schema: [
      S.breadcrumbs(crumbs),
      { '@type': 'Blog', '@id': abs(path + '#blog'), url: abs(path), name: 'Blog de fisioterapia invasiva ecoguiada', inLanguage: config.lang, publisher: { '@id': S.ids.ORG_ID() }, blogPost: ctx.posts.map((p) => ({ '@id': abs(`/blog/${p.slug}/#articulo`) })) },
      S.webPage({ path, type: 'CollectionPage', title: 'Blog', description: 'Artículos sobre fisioterapia invasiva ecoguiada.', updated: ctx.latest(ctx.posts) }),
    ],
    lastmod: ctx.latest(ctx.posts),
    priority: '0.7',
  };
}

// ---------------------------------------------------------------- FAQ
export function faqPage(ctx, pillar) {
  const path = '/preguntas-frecuentes/';
  const crumbs = [HOME, { name: 'Preguntas frecuentes', path }];
  const seen = new Set();
  const norm = (q) => q.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').trim();
  const take = (faqs, n = 99) =>
    faqs.filter((f) => {
      const k = norm(f.q);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, n);

  const groups = [
    { id: 'general', title: 'Sobre la fisioterapia invasiva ecoguiada', link: ['/fisioterapia-invasiva-ecoguiada/', 'Guía completa de fisioterapia invasiva ecoguiada'], faqs: take([...HOME_FAQS, ...pillar.faqs]) },
    ...ctx.treatments.map((t) => ({ id: t.slug, title: `Sobre ${t.shortName === 'Punción seca' ? 'la punción seca' : t.shortName === 'EPI' ? 'la EPI' : t.shortName === 'MEP' ? 'la MEP' : 'la neuromodulación percutánea'}`, link: [`/tratamientos/${t.slug}/`, `Ver la página de ${t.name}`], faqs: take(t.faqs, 4) })),
    {
      id: 'evaluacion',
      title: 'Sobre la evaluación, las sesiones y la recuperación',
      link: ['/contacto/', 'Solicitar una evaluación'],
      faqs: take([
        { q: '¿Qué tengo que llevar a la primera consulta?', a: 'Si tenés estudios previos (ecografías, resonancias, radiografías) o indicaciones médicas, traelos. También conviene usar ropa cómoda que permita descubrir la zona a evaluar.' },
        { q: '¿Necesito una orden médica?', a: 'No es imprescindible para realizar una evaluación kinesiológica. Si tu obra social o prepaga la requiere para la cobertura, consultá antes del turno. [PENDIENTE: confirmar coberturas y requisitos.]' },
        { q: '¿Cuánto dura una sesión?', a: 'La primera consulta incluye evaluación y suele ser más extensa. Las sesiones siguientes combinan reevaluación, técnica (si corresponde) y ejercicio; la duración depende del plan.' },
        { q: '¿Qué pasa si una técnica invasiva no es adecuada para mí?', a: 'Se propone otro abordaje: ejercicio terapéutico, terapia manual, educación o derivación médica cuando corresponde. La técnica se adapta al caso y no al revés.' },
        { q: '¿Atienden deportistas y personas no deportistas?', a: 'Sí. Las tendinopatías y lesiones musculares son frecuentes en deportistas, pero también aparecen por el trabajo o las actividades diarias.' },
      ]),
    },
  ];
  const all = groups.flatMap((g) => g.faqs);

  const main = `
${pageHero({
  crumbs,
  eyebrow: 'Preguntas frecuentes',
  h1: 'Preguntas frecuentes sobre fisioterapia invasiva ecoguiada',
  lead: 'Respuestas claras y prudentes a las dudas más habituales sobre EPI, neuromodulación, MEP, punción seca, la evaluación y la recuperación.',
})}
<div class="container article-layout">
  <aside class="article-aside">${tocBlock(groups.map((g) => ({ id: g.id, text: g.title })))}${asideCta()}</aside>
  <div class="prose">
    ${groups
      .map(
        (g) => `<section aria-labelledby="${g.id}" style="margin-bottom:48px"><h2 id="${g.id}">${esc(g.title)}</h2>${faqList(g.faqs)}<p style="margin-top:14px"><a href="${g.link[0]}">${esc(g.link[1])}</a></p></section>`
      )
      .join('')}
    ${reviewedBox(config.launchDate)}
  </div>
</div>
${ctaBand({ title: '¿Tu pregunta no está acá?', text: 'Escribinos por WhatsApp y te respondemos. Si es necesario, coordinamos una evaluación.' })}`;
  return {
    path,
    title: 'Preguntas frecuentes: fisioterapia invasiva, EPI y punción seca',
    description: '¿Duele la fisioterapia invasiva? ¿Cuántas sesiones de EPI se necesitan? ¿Puedo entrenar después? Respuestas claras de un kinesiólogo especializado.',
    main,
    schema: [S.breadcrumbs(crumbs), S.webPage({ path, title: 'Preguntas frecuentes', description: 'Preguntas frecuentes sobre fisioterapia invasiva ecoguiada.', updated: config.launchDate, medical: true }), S.faqPage(path, all)],
    lastmod: config.launchDate,
    priority: '0.7',
  };
}

// ---------------------------------------------------------------- Sobre mí
export function aboutPage(ctx) {
  const path = '/sobre-mi/';
  const p = config.professional;
  const crumbs = [HOME, { name: 'Sobre mí', path }];
  const list = (arr) => `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const main = `
${pageHero({
  crumbs,
  eyebrow: 'Sobre mí',
  h1: `${p.name}, ${p.role} especialista en fisioterapia invasiva ecoguiada`,
  lead: `${p.title} · Matrícula ${p.license}. Atención en {{CIUDAD}}, {{PROVINCIA}}.`,
  actions: `<div style="margin-top:24px">${ctaButtons({ primary: 'Solicitar una evaluación' })}</div>`,
})}
<section class="section"><div class="container">
  <div class="pro">
    <div class="pro-photo">${picture('profesional', `${p.name} realizando una evaluación ecográfica`, { sizes: '(min-width: 900px) 300px, 100vw' }) || '<span>[PENDIENTE: foto profesional con el ecógrafo]</span>'}</div>
    <div class="prose">
      <h2>Mi forma de trabajar</h2>
      <p>Me especializo en el tratamiento de lesiones musculoesqueléticas combinando <strong>kinesiología, ecografía musculoesquelética, fisioterapia invasiva y ejercicio terapéutico</strong>. La ecografía me permite ver la estructura que genera el problema y, cuando está indicado, intervenir sobre ella con precisión.</p>
      <p>Pero ninguna técnica funciona sola. Cada tratamiento empieza con una evaluación completa y continúa con un plan de readaptación para que vuelvas a tu actividad con un tejido capaz de tolerar la carga. Si una técnica invasiva no es la mejor opción para tu caso, te lo voy a decir.</p>
      <p>[EXPERIENCIA]</p>
    </div>
  </div>
</div></section>
<section class="section section-alt" aria-labelledby="formacion"><div class="container">
  <div class="section-head"><p class="eyebrow">Credenciales</p><h2 id="formacion">Formación y especialización</h2></div>
  <div class="grid grid-3">
    <div class="card"><span class="card-icon">${icon('book')}</span><h3>Formación de grado y posgrado</h3><div class="prose">${list(p.education)}</div></div>
    <div class="card"><span class="card-icon">${icon('probe')}</span><h3>Especializaciones</h3><div class="prose">${list(p.specializations)}</div></div>
    <div class="card"><span class="card-icon">${icon('shield')}</span><h3>Cursos y certificaciones</h3><div class="prose">${list(p.certifications)}</div></div>
  </div>
  <h3 style="margin-top:36px">Sellos de certificación</h3>
  ${certStrip()}
  <p class="muted" style="margin-top:20px">Matrícula profesional: <strong>${esc(p.license)}</strong>.</p>
</div></section>
<section class="section" aria-labelledby="areas"><div class="container split">
  <div><p class="eyebrow">Áreas de trabajo</p><h2 id="areas">En qué me especializo</h2>
  <ul class="checklist">
    <li>${icon('check')}<span><a href="/fisioterapia-invasiva-ecoguiada/">Fisioterapia invasiva ecoguiada</a></span></li>
    <li>${icon('check')}<span>Ecografía musculoesquelética aplicada a la kinesiología</span></li>
    <li>${icon('check')}<span><a href="/tratamientos/epi-electrolisis-percutanea/">EPI</a>, <a href="/tratamientos/microelectrolisis-percutanea-mep/">MEP</a>, <a href="/tratamientos/neuromodulacion-percutanea-ecoguiada/">neuromodulación percutánea</a> y <a href="/tratamientos/puncion-seca-ecoguiada/">punción seca</a> ecoguiadas</span></li>
    <li>${icon('check')}<span>Tratamiento de <a href="/lesiones/">tendinopatías y lesiones deportivas</a></span></li>
    <li>${icon('check')}<span>Rehabilitación, readaptación y ejercicio terapéutico</span></li>
  </ul></div>
  <div class="prose">
    <h2 id="politica-editorial">Política editorial y revisión del contenido</h2>
    <p>Todo el contenido clínico de este sitio —páginas de tratamientos, lesiones y artículos del blog— es redactado o revisado por <strong>${esc(p.name)}</strong>, ${esc(p.role)}, matrícula ${esc(p.license)}.</p>
    <p>Cada página indica su fecha de revisión. El contenido se actualiza cuando cambian las recomendaciones o la práctica clínica, utiliza un lenguaje prudente y evita promesas de resultados. Es información educativa: <strong>no reemplaza una consulta</strong> ni un diagnóstico médico.</p>
    <p>Si encontrás un error o una información desactualizada, podés escribir a través de la <a href="/contacto/">página de contacto</a>.</p>
  </div>
</div></section>
${ctaBand({})}`;
  return {
    path,
    title: `{{NOMBRE}} | Kinesiología y Fisioterapia Invasiva en {{CIUDAD}}`,
    description: 'Formación, matrícula y forma de trabajo de {{NOMBRE}}, especialista en fisioterapia invasiva ecoguiada y rehabilitación en {{CIUDAD}}.',
    main,
    schema: [S.breadcrumbs(crumbs), S.webPage({ path, type: 'ProfilePage', title: 'Sobre mí', description: 'Perfil profesional.', updated: config.launchDate, extra: { mainEntity: { '@id': S.ids.PERSON_ID() } } })],
    lastmod: config.launchDate,
    priority: '0.8',
  };
}

// ---------------------------------------------------------------- Contacto
export function contactPage(ctx) {
  const path = '/contacto/';
  const b = config.business;
  const c = config.contact;
  const crumbs = [HOME, { name: 'Contacto', path }];
  const mapsHref = known(b.mapsUrl) || (b.geo ? `https://www.google.com/maps/search/?api=1&query=${b.geo.lat},${b.geo.lng}` : '');
  const waNumber = (c.whatsapp || '').replace(/\D/g, '');
  const main = `
${pageHero({
  crumbs,
  eyebrow: 'Contacto y turnos',
  h1: 'Solicitar evaluación de fisioterapia invasiva en {{CIUDAD}}',
  lead: 'Escribinos por WhatsApp contando brevemente qué te pasa. Coordinamos una primera consulta de evaluación clínica y ecográfica.',
})}
<section class="section"><div class="container contact-grid">
  <div>
    <h2>Datos de contacto</h2>
    <ul class="nap">
      <li>${icon('pin')}<span><strong>Dirección</strong>${esc(b.address)}, ${esc(b.city)}, ${esc(b.province)} ${esc(b.postalCode)}</span></li>
      <li>${icon('whatsapp')}<span><strong>WhatsApp / Teléfono</strong>${hasWhatsapp() ? `<a href="${esc(waLink())}">${esc(c.phoneDisplay)}</a>` : esc(c.phoneDisplay)}</span></li>
      <li>${icon('clock')}<span><strong>Horarios</strong>${esc(config.hoursText)}</span></li>
      <li>${icon('instagram')}<span><strong>Instagram</strong>${known(c.instagram) ? `<a href="${esc(c.instagram)}" rel="noopener" target="_blank">${esc(c.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/$/, ''))}</a>` : esc(c.instagram)}</span></li>
      ${known(c.email) ? `<li>${icon('book')}<span><strong>Email</strong><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></span></li>` : ''}
      <li>${icon('shield')}<span><strong>Profesional</strong>${esc(config.professional.name)} · Mat. ${esc(config.professional.license)}</span></li>
    </ul>
    <div class="map-ph" style="margin-top:28px">${
      mapsHref
        ? `<div>${icon('pin', { size: 32 })}<p style="margin:10px 0 14px">${esc(b.address)}, ${esc(b.city)}</p><a class="btn btn-ghost btn-sm" href="${esc(mapsHref)}" rel="noopener" target="_blank">Cómo llegar en Google Maps</a></div>`
        : `<p>[PENDIENTE: enlace de Google Maps / Google Business Profile]</p>`
    }</div>
  </div>
  <div id="turno">
    <h2>Solicitar turno</h2>
    <p class="muted">Completá estos datos y se abrirá WhatsApp con el mensaje listo para enviar. No se almacena ninguna información en este sitio.</p>
    <form class="form" id="wa-form" data-wa="${esc(waNumber)}" action="${hasWhatsapp() ? `https://wa.me/${waNumber}` : '#'}" method="get" target="_blank" rel="noopener">
      <label>Nombre<input name="nombre" autocomplete="given-name" required></label>
      <label>¿Qué zona te molesta?
        <select name="zona"><option value="">Elegí una opción</option><option>Hombro</option><option>Codo / antebrazo</option><option>Cadera / glúteo</option><option>Rodilla</option><option>Tobillo / tendón de Aquiles</option><option>Pie / talón</option><option>Músculo (desgarro, contractura)</option><option>Columna / cuello</option><option>Otra</option></select>
      </label>
      <label>Contanos brevemente qué te pasa <small>(desde cuándo, qué actividad hacés)</small><textarea name="detalle" rows="4"></textarea></label>
      <label>Preferencia horaria<select name="horario"><option value="">Sin preferencia</option><option>Mañana</option><option>Tarde</option></select></label>
      <input type="hidden" name="text" value="">
      <button class="btn btn-primary" type="submit">${icon('whatsapp', { size: 20 })}Enviar por WhatsApp</button>
      <small>Al enviar, se abre WhatsApp en tu dispositivo. Revisá el mensaje antes de mandarlo.</small>
    </form>
  </div>
</div></section>
<section class="section section-alt" aria-labelledby="primera-consulta"><div class="container split">
  <div><p class="eyebrow">Primera consulta</p><h2 id="primera-consulta">Qué incluye la evaluación</h2>
  <ul class="checklist">
    <li>${icon('check')}<span>Entrevista sobre tu lesión, actividad y objetivos.</span></li>
    <li>${icon('check')}<span>Exploración física: movilidad, fuerza y tolerancia a la carga.</span></li>
    <li>${icon('check')}<span>Ecografía musculoesquelética de la zona.</span></li>
    <li>${icon('check')}<span>Explicación de lo encontrado y propuesta de plan.</span></li>
  </ul>
  <p>Si tenés estudios previos, traelos. Más detalles en <a href="/blog/primera-sesion-fisioterapia-invasiva/">qué esperar en la primera sesión</a>.</p></div>
  <div class="prose"><h2>Áreas de atención</h2><p>Atendemos pacientes de {{CIUDAD}} y alrededores: ${config.business.areaServed.map(esc).join(', ')}.</p><p>[PENDIENTE: obras sociales / prepagas y formas de pago]</p></div>
</div></section>`;

  const script = `<script>(function(){var f=document.getElementById('wa-form');if(!f)return;f.addEventListener('submit',function(e){var n=f.dataset.wa;var d=new FormData(f);var t='Hola, quería solicitar una evaluación.'+(d.get('nombre')?'\\nNombre: '+d.get('nombre'):'')+(d.get('zona')?'\\nZona: '+d.get('zona'):'')+(d.get('detalle')?'\\nDetalle: '+d.get('detalle'):'')+(d.get('horario')?'\\nPreferencia horaria: '+d.get('horario'):'');e.preventDefault();if(!n){alert('El número de WhatsApp todavía no está configurado.');return;}window.open('https://wa.me/'+n+'?text='+encodeURIComponent(t),'_blank','noopener');});})();</script>`;

  return {
    path,
    title: 'Contacto y turnos | Fisioterapia Invasiva en {{CIUDAD}}',
    description: 'Dirección, horarios y WhatsApp para solicitar una evaluación de fisioterapia invasiva ecoguiada con {{NOMBRE}} en {{CIUDAD}}, {{PROVINCIA}}.',
    main,
    scripts: script,
    schema: [S.breadcrumbs(crumbs), S.webPage({ path, type: 'ContactPage', title: 'Contacto', description: 'Datos de contacto y turnos.', updated: config.launchDate, extra: { about: { '@id': S.ids.ORG_ID() } } })],
    lastmod: config.launchDate,
    priority: '0.8',
  };
}

// ---------------------------------------------------------------- Legales
export function legalPages() {
  const name = known(config.business.name) || config.professional.name;
  const pages = [
    {
      path: '/aviso-legal/',
      crumb: 'Aviso legal',
      h1: 'Aviso legal',
      title: 'Aviso legal | {{NOMBRE}}',
      description: 'Condiciones de uso del sitio web y alcance de la información publicada.',
      body: `
## Titular del sitio

Este sitio web es titularidad de **${name}** (${config.professional.name}, ${config.professional.title}, matrícula ${config.professional.license}), con domicilio profesional en ${config.business.address}, ${config.business.city}, ${config.business.province}. CUIT: [PENDIENTE].

## Alcance de la información

El contenido publicado tiene fines **exclusivamente informativos y educativos**. No constituye un diagnóstico ni reemplaza la consulta con un profesional de la salud. Las técnicas descriptas se indican únicamente tras una evaluación individual.

## Propiedad intelectual

Los textos, ilustraciones y elementos gráficos de este sitio pertenecen a su titular, salvo indicación en contrario. Se permite citar fragmentos breves con mención de la fuente y enlace a la página original.

## Enlaces externos

El sitio puede incluir enlaces a sitios de terceros (por ejemplo, WhatsApp, Instagram o Google Maps). El titular no se responsabiliza por los contenidos ni por las políticas de esos sitios.

## Legislación aplicable

Estas condiciones se rigen por las leyes de la República Argentina.
`,
    },
    {
      path: '/politica-de-privacidad/',
      crumb: 'Política de privacidad',
      h1: 'Política de privacidad',
      title: 'Política de privacidad | {{NOMBRE}}',
      description: 'Cómo se tratan los datos personales de quienes visitan el sitio o se contactan por WhatsApp.',
      body: `
## Responsable

El responsable del tratamiento de datos es **${name}**, con domicilio en ${config.business.address}, ${config.business.city}, ${config.business.province}.

## Qué datos se recogen

- **Este sitio no almacena datos personales.** El formulario de turnos solo arma un mensaje que se abre en tu propia aplicación de WhatsApp; vos decidís si enviarlo.
- Los datos que compartas por WhatsApp o en la consulta se utilizan únicamente para gestionar turnos y para tu atención.
- ${config.gaId ? 'El sitio utiliza Google Analytics para obtener estadísticas de uso agregadas y anónimas.' : 'El sitio no utiliza cookies de seguimiento ni herramientas de analítica.'}

## Datos de salud

La información clínica que surja de la atención se trata con estricta confidencialidad y conforme al secreto profesional, la Ley 26.529 de Derechos del Paciente y la Ley 25.326 de Protección de los Datos Personales.

## Tus derechos

Podés solicitar el acceso, la rectificación o la supresión de tus datos escribiendo a ${config.contact.email || '[PENDIENTE: email de contacto]'}. La Agencia de Acceso a la Información Pública, en su carácter de órgano de control de la Ley 25.326, tiene la atribución de atender las denuncias y reclamos relacionados con el incumplimiento de las normas sobre protección de datos personales.

## Actualizaciones

Esta política puede actualizarse. La versión vigente es la publicada en esta página.
`,
    },
  ];

  return pages.map((pg) => {
    const crumbs = [HOME, { name: pg.crumb, path: pg.path }];
    return {
      path: pg.path,
      title: pg.title,
      description: pg.description,
      noindex: true,
      main: `${pageHero({ crumbs, h1: pg.h1 })}<div class="container article-layout"><div class="prose">${markdown(pg.body).html}<p class="muted">Última actualización: ${formatDate(config.launchDate)}.</p></div></div>`,
      schema: [S.breadcrumbs(crumbs)],
      sitemap: false,
    };
  });
}

export function notFoundPage(ctx) {
  return {
    path: '/404.html',
    title: 'Página no encontrada | {{NOMBRE}}',
    description: 'La página que buscás no existe o cambió de dirección.',
    noindex: true,
    sitemap: false,
    main: `<section class="section"><div class="container" style="max-width:760px">
<p class="eyebrow">Error 404</p><h1>No encontramos esta página</h1>
<p class="lead">Puede que la dirección haya cambiado. Estas secciones pueden ayudarte:</p>
<ul class="checklist">
<li>${icon('arrow')}<a href="/fisioterapia-invasiva-ecoguiada/">Fisioterapia invasiva ecoguiada</a></li>
<li>${icon('arrow')}<a href="/tratamientos/">Tratamientos</a></li>
<li>${icon('arrow')}<a href="/lesiones/">Lesiones</a></li>
<li>${icon('arrow')}<a href="/contacto/">Contacto y turnos</a></li>
</ul></div></section>`,
    schema: [],
  };
}
