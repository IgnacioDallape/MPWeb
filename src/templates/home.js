import { config, esc, waLink, known } from '../lib/site.js';
import { icon } from '../lib/icons.js';
import { ultrasoundHero, layersFigure } from '../lib/visuals.js';
import { ctaButtons, faqList, picture } from '../lib/components.js';
import { CATEGORIES, treatmentCard } from './detail.js';
import * as S from '../lib/schema.js';

const HOME_FAQS = [
  {
    q: '¿Qué es la fisioterapia invasiva ecoguiada?',
    a: 'Es un conjunto de técnicas que utilizan agujas ultrafinas para actuar directamente sobre la estructura afectada (tendón, músculo, ligamento o nervio periférico), guiadas en todo momento por ecografía. Forma parte de un tratamiento integral con ejercicio terapéutico.',
  },
  {
    q: '¿La fisioterapia invasiva duele?',
    a: 'Puede generar una molestia breve durante la aplicación, cuya intensidad depende de la técnica y de cada persona. Se adapta a tu tolerancia y siempre se puede detener. Después es habitual una molestia local leve durante algunas horas.',
  },
  {
    q: '¿Qué lesiones pueden tratarse?',
    a: 'Principalmente tendinopatías (Aquiles, rotuliana, manguito rotador, epicondilitis, epitrocleitis), fascitis plantar, lesiones musculares, ligamentarias, bursopatías y algunos cuadros de dolor musculoesquelético persistente. La indicación depende de la evaluación.',
  },
  {
    q: '¿Es necesaria una evaluación previa?',
    a: 'Sí. Toda intervención comienza con una anamnesis, una exploración física y una valoración ecográfica. Si una técnica invasiva no es adecuada para tu caso, se propone otro abordaje.',
  },
  {
    q: '¿Qué diferencia existe entre EPI y punción seca?',
    a: 'La EPI aplica corriente galvánica sobre el tejido lesionado —con frecuencia el tendón— para estimular su reparación. La punción seca no utiliza corriente y se dirige sobre todo a puntos gatillo musculares. Tienen objetivos distintos y pueden combinarse.',
  },
  {
    q: '¿Puedo entrenar después del tratamiento?',
    a: 'En general sí, con ajustes. No suele indicarse reposo absoluto: se modula temporalmente la carga de la actividad que más exige al tejido tratado y se sigue un plan de ejercicio progresivo.',
  },
];

export function homePage(ctx) {
  const p = config.professional;
  const b = config.business;
  const wa = 'Hola, quería solicitar una evaluación de fisioterapia invasiva ecoguiada.';
  const lesionsByCat = Object.entries(CATEGORIES).map(([key, cat]) => ({ key, ...cat, items: ctx.lesions.filter((l) => l.category === key) }));

  const main = `
<section class="hero" aria-labelledby="h1">
  <div class="container hero-grid">
    <div class="fade-up">
      <p class="eyebrow">Kinesiología · Ecografía · Rehabilitación deportiva</p>
      <h1 id="h1">Fisioterapia Invasiva Ecoguiada <span class="accent">en {{CIUDAD}}</span></h1>
      <p class="lead">Tratamientos de alta precisión guiados por ecografía para lesiones musculares, tendinosas y del sistema nervioso periférico, integrados con rehabilitación y ejercicio terapéutico.</p>
      ${ctaButtons({ waMessage: wa, primary: 'Solicitar evaluación', secondary: 'Conocer tratamientos', secondaryHref: '/tratamientos/' })}
      <p class="hero-trust">${icon('shield')}<span><strong>${esc(p.name)}</strong> · ${esc(p.title)} · Mat. ${esc(p.license)}<br>${esc(b.address)}, ${esc(b.city)}</span></p>
    </div>
    <div class="hero-visual fade-up d2">
      <div class="scan">${ultrasoundHero()}</div>
      <p class="scan-badge b1">${icon('target', { size: 20 })}Intervención sobre la estructura afectada</p>
      <p class="scan-badge b2">${icon('probe', { size: 20 })}Ecografía en tiempo real</p>
    </div>
  </div>
</section>

<section aria-label="Diferenciales" class="container" style="margin-top:-24px">
  <div class="pillars">
    <div class="pillar">${icon('probe')}<strong>Ecografía en tiempo real</strong><span>Se ve la estructura y la aguja durante toda la intervención.</span></div>
    <div class="pillar">${icon('needle')}<strong>Mínimamente invasivo</strong><span>Agujas ultrafinas, material estéril de un solo uso.</span></div>
    <div class="pillar">${icon('evaluation')}<strong>Evaluación individual</strong><span>Anamnesis, exploración y ecografía antes de decidir.</span></div>
    <div class="pillar">${icon('activity')}<strong>Rehabilitación y ejercicio</strong><span>La técnica se integra en un plan de cargas progresivas.</span></div>
  </div>
</section>

<section class="section" aria-labelledby="que-es">
  <div class="container split">
    <div>
      <p class="eyebrow">Descripción</p>
      <h2 id="que-es">Precisión sobre el tejido que origina el problema</h2>
      <p>La <strong>fisioterapia invasiva ecoguiada</strong> engloba tratamientos que utilizan agujas ultrafinas para actuar directamente sobre la estructura afectada, siempre guiados por ecografía. Permite tratar de forma precisa lesiones tendinosas, musculares, ligamentarias y estructuras relacionadas con el sistema nervioso periférico.</p>
      <p>Tras una evaluación y anamnesis completa se identifica la estructura implicada y se determina el tratamiento más adecuado. Estas intervenciones forman parte de un abordaje integral que se complementa con readaptación, ejercicio terapéutico y cargas progresivas.</p>
      <a class="btn btn-ghost" href="/fisioterapia-invasiva-ecoguiada/">Qué es la fisioterapia invasiva ecoguiada${icon('arrow', { size: 18 })}</a>
    </div>
    <figure class="figure">${layersFigure()}<figcaption>La sonda ecográfica permite seguir el recorrido de la aguja hasta la estructura objetivo.</figcaption></figure>
  </div>
</section>

<section class="section section-alt" aria-labelledby="por-que">
  <div class="container">
    <div class="section-head center">
      <p class="eyebrow">Beneficios</p>
      <h2 id="por-que">¿Por qué utilizar fisioterapia invasiva ecoguiada?</h2>
      <p class="lead">La ecografía convierte una técnica basada en la palpación en una intervención visible, específica y controlada.</p>
    </div>
    <div class="grid grid-3">
      ${[
        ['target', 'Mayor precisión', 'La ecografía permite visualizar las estructuras en tiempo real y guiar la intervención hacia la zona de interés.'],
        ['needle', 'Intervención específica', 'Permite actuar directamente sobre determinadas estructuras musculares, tendinosas o nerviosas, y no sobre el tejido de alrededor.'],
        ['pulse', 'Abordaje del dolor persistente', 'Algunas técnicas pueden incorporarse al tratamiento de cuadros musculoesqueléticos que se mantienen en el tiempo.'],
        ['layers', 'Lesiones complejas', 'Puede utilizarse dentro del plan de rehabilitación de lesiones crónicas o recurrentes que no evolucionan como se espera.'],
        ['activity', 'Integración con rehabilitación', 'No es una intervención aislada: se complementa con ejercicio terapéutico, readaptación y progresión de cargas.'],
      ]
        .map(([ic, t, d]) => `<div class="card"><span class="card-icon">${icon(ic)}</span><h3>${t}</h3><p>${d}</p></div>`)
        .join('')}
      <div class="card card-feature"><span class="card-icon">${icon('shield')}</span><h3>Seguridad</h3><p>Ver vasos, nervios y otras estructuras sensibles durante la intervención permite evitarlos.</p></div>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="tratamientos">
  <div class="container">
    <div class="section-head">
      <p class="eyebrow">Tratamientos</p>
      <h2 id="tratamientos">Técnicas de fisioterapia invasiva guiadas por ecografía</h2>
      <p class="lead">Cada técnica tiene un objetivo distinto. La elección depende del tejido afectado, de la fase de la lesión y de tu actividad.</p>
    </div>
    <div class="grid grid-4">${ctx.treatments.map(treatmentCard).join('')}</div>
    <p style="margin-top:24px"><a href="/tratamientos/">Comparar todos los tratamientos</a></p>
  </div>
</section>

<section class="section section-alt" aria-labelledby="lesiones">
  <div class="container">
    <div class="section-head">
      <p class="eyebrow">Patologías</p>
      <h2 id="lesiones">¿Qué lesiones y patologías pueden abordarse?</h2>
      <p class="lead">Lesiones deportivas y del día a día en las que la fisioterapia invasiva ecoguiada puede formar parte del plan.</p>
    </div>
    <div class="cat-grid">
      ${lesionsByCat
        .map(
          (c) => `<div class="cat"><h3>${icon(c.icon)}${esc(c.label)}</h3><ul>${c.items
            .map((l) => `<li><a href="/lesiones/${l.slug}/">${esc(l.name)}${icon('arrow')}</a></li>`)
            .join('')}</ul></div>`
        )
        .join('')}
    </div>
  </div>
</section>

<section class="section" aria-labelledby="proceso">
  <div class="container">
    <div class="section-head">
      <p class="eyebrow">Metodología</p>
      <h2 id="proceso">Primero se evalúa. Después se decide.</h2>
      <p class="lead">Ninguna técnica se aplica sin entender antes qué le pasa a tu tejido y qué necesitás recuperar.</p>
    </div>
    <ol class="steps">
      <li><h3>Evaluación y anamnesis</h3><p>Historia de la lesión, actividad, tratamientos previos y pruebas físicas de movilidad, fuerza y carga.</p></li>
      <li><h3>Ecografía musculoesquelética</h3><p>Se observa la estructura afectada, su organización y su comportamiento en movimiento.</p></li>
      <li><h3>Intervención ecoguiada</h3><p>Si está indicada, se aplica la técnica más adecuada con guía ecográfica en tiempo real.</p></li>
      <li><h3>Readaptación y ejercicio</h3><p>Plan de cargas progresivas para consolidar la recuperación y volver a tu actividad.</p></li>
    </ol>
  </div>
</section>

<section class="section section-alt" aria-labelledby="profesional">
  <div class="container">
    <div class="pro">
      <div class="pro-photo">${picture('profesional', `${p.name}, especialista en fisioterapia invasiva ecoguiada, realizando una ecografía`, { sizes: '(min-width: 900px) 300px, 100vw' }) || '<span>[PENDIENTE: foto profesional realizando una ecografía]</span>'}</div>
      <div>
        <p class="eyebrow">Metodología · Profesional</p>
        <h2 id="profesional">${esc(p.name)}</h2>
        <p class="lead">${esc(p.title)} con formación específica en ecografía musculoesquelética y fisioterapia invasiva.</p>
        <dl>
          <div><dt>Matrícula</dt><dd>${esc(p.license)}</dd></div>
          <div><dt>Formación</dt><dd>${p.education.map(esc).join('<br>')}</dd></div>
          <div><dt>Especialización</dt><dd>${p.specializations.map(esc).join('<br>')}</dd></div>
          <div><dt>Experiencia</dt><dd>${esc(p.experience)}</dd></div>
        </dl>
        <a class="btn btn-ghost" href="/sobre-mi/">Conocer trayectoria y formación${icon('arrow', { size: 18 })}</a>
      </div>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="faq-home">
  <div class="container split" style="align-items:start">
    <div>
      <p class="eyebrow">Preguntas frecuentes y datos</p>
      <h2 id="faq-home">Lo que más se consulta antes de empezar</h2>
      <p class="lead">Respuestas claras sobre cómo es el tratamiento, qué se siente y qué esperar.</p>
      <a class="btn btn-ghost" href="/preguntas-frecuentes/">Ver todas las preguntas${icon('arrow', { size: 18 })}</a>
      <h3 style="margin-top:36px;font-size:1rem">Para profundizar</h3>
      <ul class="checklist">${ctx.homePosts.map((p) => `<li>${icon('book')}<a href="/blog/${p.slug}/">${esc(p.h1)}</a></li>`).join('')}</ul>
    </div>
    ${faqList(HOME_FAQS)}
  </div>
</section>

<section class="section" style="padding-top:0" aria-labelledby="contacto-home">
  <div class="container">
    <div class="cta-band">
      <div class="contact-grid" style="align-items:center">
        <div>
          <p class="eyebrow" style="color:#d6d9dc">Turnos en {{CIUDAD}}</p>
          <h2 id="contacto-home">Solicitá tu evaluación</h2>
          <p>Contanos brevemente qué te pasa y coordinamos una primera consulta de evaluación clínica y ecográfica.</p>
          <div class="btn-row"><a class="btn btn-light" href="${esc(waLink(wa))}">${icon('whatsapp', { size: 20 })}Hablar por WhatsApp</a><a class="btn btn-ghost" href="/contacto/">Ver dirección y horarios${icon('arrow', { size: 18 })}</a></div>
        </div>
        <address class="footer-nap" style="font-style:normal;color:#e8eaec">
          <span>${icon('pin')}<span><strong>${esc(known(b.name) ? b.name : p.name)}</strong><br>${esc(b.address)}, ${esc(b.city)}, ${esc(b.province)}</span></span>
          <span>${icon('whatsapp')}<span>${esc(config.contact.phoneDisplay)}</span></span>
          <span>${icon('clock')}<span>${esc(config.hoursText)}</span></span>
        </address>
      </div>
    </div>
  </div>
</section>`;

  return {
    path: '/',
    title: 'Fisioterapia Invasiva Ecoguiada en {{CIUDAD}} | {{NOMBRE}}',
    description:
      'Fisioterapia invasiva ecoguiada en {{CIUDAD}}: EPI, neuromodulación percutánea, MEP y punción seca para tendinopatías y lesiones deportivas.',
    main,
    waMessage: wa,
    schema: [
      S.webPage({ path: '/', title: 'Fisioterapia Invasiva Ecoguiada', description: 'Kinesiología especializada en fisioterapia invasiva ecoguiada.', updated: config.launchDate, extra: { about: { '@id': S.ids.ORG_ID() }, mainEntity: { '@id': S.ids.ORG_ID() } } }),
      S.faqPage('/', HOME_FAQS),
    ],
    lastmod: config.launchDate,
    priority: '1.0',
  };
}

export { HOME_FAQS };
