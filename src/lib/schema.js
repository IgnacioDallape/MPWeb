// Schema.org en un único @graph por página. Los datos pendientes se omiten.
import { config, known, abs, tokens } from './site.js';
import { imagePath } from './components.js';

const ORG_ID = () => abs('/#consultorio');
const PERSON_ID = () => abs('/#profesional');
const SITE_ID = () => abs('/#website');

const clean = (o) => {
  if (Array.isArray(o)) {
    const arr = o.map(clean).filter((v) => v !== undefined);
    return arr.length ? arr : undefined;
  }
  if (o && typeof o === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(o)) {
      const c = clean(v);
      if (c !== undefined) out[k] = c;
    }
    // Un nodo que quedó solo con "@type" (todos sus datos pendientes) se descarta.
    const keys = Object.keys(out).filter((k) => k !== '@type');
    return keys.length ? out : undefined;
  }
  if (typeof o === 'string') return known(o);
  return o;
};

export function organization() {
  const b = config.business;
  const c = config.contact;
  return {
    '@type': 'Physiotherapy', // subtipo de MedicalBusiness → LocalBusiness
    '@id': ORG_ID(),
    name: known(b.name) || b.specialty,
    description: tokens(
      'Consultorio de kinesiología especializado en fisioterapia invasiva ecoguiada: EPI, neuromodulación percutánea, MEP y punción seca guiadas por ecografía, integradas con rehabilitación y ejercicio terapéutico.'
    ),
    url: abs('/'),
    image: abs('/img/og-default.jpg'),
    logo: abs('/favicon.svg'),
    telephone: known(c.phoneDisplay),
    email: known(c.email),
    medicalSpecialty: 'https://schema.org/Physiotherapy',
    address: {
      '@type': 'PostalAddress',
      streetAddress: known(b.address),
      addressLocality: known(b.city),
      addressRegion: known(b.province),
      postalCode: known(b.postalCode),
      addressCountry: b.country,
    },
    geo: b.geo ? { '@type': 'GeoCoordinates', latitude: b.geo.lat, longitude: b.geo.lng } : undefined,
    hasMap: known(b.mapsUrl),
    openingHoursSpecification: config.hours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days.map((d) => `https://schema.org/${d}`),
      opens: h.opens,
      closes: h.closes,
    })),
    areaServed: [
      ...b.areaServed.map((a) => (known(a) ? { '@type': 'City', name: a } : undefined)),
      known(b.province) ? { '@type': 'AdministrativeArea', name: `Provincia de ${b.province}` } : undefined,
    ],
    sameAs: [known(c.instagram)],
    availableService: [
      { '@id': abs('/tratamientos/epi-electrolisis-percutanea/#procedimiento') },
      { '@id': abs('/tratamientos/neuromodulacion-percutanea-ecoguiada/#procedimiento') },
      { '@id': abs('/tratamientos/microelectrolisis-percutanea-mep/#procedimiento') },
      { '@id': abs('/tratamientos/puncion-seca-ecoguiada/#procedimiento') },
    ],
  };
}

export function person() {
  const p = config.professional;
  return {
    '@type': 'Person',
    '@id': PERSON_ID(),
    name: known(p.name),
    jobTitle: known(p.title),
    url: abs('/sobre-mi/'),
    image: imagePath('profesional') ? abs(imagePath('profesional')) : undefined,
    worksFor: { '@id': ORG_ID() },
    hasCredential: known(p.license)
      ? { '@type': 'EducationalOccupationalCredential', credentialCategory: 'Matrícula profesional', name: `Matrícula ${p.license}` }
      : undefined,
    alumniOf: p.education.filter(known).map((e) => ({ '@type': 'EducationalOrganization', name: e })),
    knowsAbout: [
      'Fisioterapia invasiva ecoguiada',
      'Ecografía musculoesquelética',
      'Electrólisis percutánea intratisular (EPI)',
      'Microelectrólisis percutánea (MEP)',
      'Neuromodulación percutánea ecoguiada',
      'Punción seca',
      'Tendinopatías',
      'Lesiones musculares',
      'Rehabilitación deportiva',
      'Ejercicio terapéutico',
    ],
    sameAs: [known(config.contact.instagram)],
  };
}

export function website() {
  return {
    '@type': 'WebSite',
    '@id': SITE_ID(),
    url: abs('/'),
    name: known(config.business.name) || config.business.specialty,
    inLanguage: config.lang,
    publisher: { '@id': ORG_ID() },
  };
}

export function breadcrumbs(items) {
  return {
    '@type': 'BreadcrumbList',
    '@id': abs(items[items.length - 1].path + '#breadcrumbs'),
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}

export function faqPage(path, faqs) {
  return {
    '@type': 'FAQPage',
    '@id': abs(path + '#faq'),
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: tokens(f.q),
      acceptedAnswer: { '@type': 'Answer', text: tokens(f.a).replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '') },
    })),
  };
}

export function webPage({ path, type = 'WebPage', title, description, updated, published, medical = false, about, extra = {} }) {
  return {
    '@type': medical ? 'MedicalWebPage' : type,
    '@id': abs(path + '#webpage'),
    url: abs(path),
    name: title,
    description,
    inLanguage: config.lang,
    isPartOf: { '@id': SITE_ID() },
    datePublished: published,
    dateModified: updated,
    lastReviewed: medical ? updated : undefined,
    reviewedBy: medical ? { '@id': ORG_ID() } : undefined,
    about,
    breadcrumb: path === '/' ? undefined : { '@id': abs(path + '#breadcrumbs') },
    ...extra,
  };
}

export function procedure(path, p) {
  return {
    '@type': 'MedicalProcedure',
    '@id': abs(path + '#procedimiento'),
    name: p.name,
    alternateName: p.alternateName,
    url: abs(path),
    description: tokens(p.description),
    procedureType: 'https://schema.org/PercutaneousProcedure',
    howPerformed: tokens(p.howPerformed),
    preparation: tokens(p.preparation),
    followup: tokens(p.followup),
    bodyLocation: p.bodyLocation,
    provider: { '@id': ORG_ID() },
  };
}

export function condition(path, c, treatmentPaths = []) {
  return {
    '@type': 'MedicalCondition',
    '@id': abs(path + '#condicion'),
    name: c.name,
    alternateName: c.alternateName,
    description: tokens(c.description),
    associatedAnatomy: c.anatomy ? { '@type': 'AnatomicalStructure', name: c.anatomy } : undefined,
    signOrSymptom: (c.symptoms || []).map((s) => ({ '@type': 'MedicalSymptom', name: s })),
    possibleTreatment: treatmentPaths.map((t) => ({ '@id': abs(t + '#procedimiento') })),
  };
}

export function article(path, post, image) {
  return {
    '@type': 'BlogPosting',
    '@id': abs(path + '#articulo'),
    headline: tokens(post.h1),
    description: tokens(post.description),
    image,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    inLanguage: config.lang,
    mainEntityOfPage: { '@id': abs(path + '#webpage') },
    author: { '@id': ORG_ID() },
    publisher: { '@id': ORG_ID() },
    articleSection: post.category,
    keywords: post.seo?.secondary?.join(', '),
  };
}

export function graph(nodes) {
  const data = clean({ '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) });
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

export const ids = { ORG_ID, PERSON_ID, SITE_ID };
