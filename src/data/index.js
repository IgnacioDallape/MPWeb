// Capa de datos: carga el contenido editorial (src/content) y arma la red semántica.
const load = (mods) =>
  Object.values(mods)
    .map((m) => m.default)
    .filter((x) => !x.draft);

export const CATEGORIES = {
  zonas: { label: 'Dolor por zona', icon: 'target', intro: 'Dolor de espalda, hombro, codo, muñeca, cadera, rodilla o tobillo: qué puede estar pasando y cómo se evalúa.' },
  columna: { label: 'Columna', icon: 'layers', intro: 'Ciática, hernia de disco y escoliosis: evaluación y ejercicio para la columna.' },
  tendinosas: { label: 'Lesiones tendinosas', icon: 'tendon', intro: 'Tendinitis, tendón de Aquiles, rotuliano, manguito rotador, epicondilitis, epitrocleitis y otras tendinopatías.' },
  musculares: { label: 'Lesiones musculares', icon: 'muscle', intro: 'Contracturas, tortícolis, desgarros, dolor miofascial y fibrosis tras lesiones previas.' },
  sobrecarga: { label: 'Lesiones por sobrecarga', icon: 'bolt', intro: 'Fascitis plantar, pubalgia, periostitis tibial y otras lesiones por exceso de carga.' },
  ligamentarias: { label: 'Lesiones ligamentarias', icon: 'joint', intro: 'Esguinces y lesiones de ligamentos con dolor o inestabilidad persistente.' },
  articulares: { label: 'Lesiones articulares y bursitis', icon: 'joint', intro: 'Menisco, artrosis de rodilla, dolor de rótula, hombro congelado y bursitis.' },
  nerviosas: { label: 'Atrapamientos nerviosos', icon: 'nerve', intro: 'Síndrome del túnel carpiano y otros atrapamientos de nervios periféricos.' },
  dolor: { label: 'Dolor musculoesquelético persistente', icon: 'pulse', intro: 'Dolor que se mantiene en el tiempo y necesita un abordaje integral.' },
};
const catOrder = Object.keys(CATEGORIES);

export const treatments = load(import.meta.glob('../content/tratamientos/*.js', { eager: true })).sort((a, b) => a.order - b.order);
export const lesions = load(import.meta.glob('../content/lesiones/*.js', { eager: true })).sort(
  (a, b) => catOrder.indexOf(a.category) - catOrder.indexOf(b.category) || a.order - b.order
);
export const posts = load(import.meta.glob('../content/blog/*.js', { eager: true })).sort((a, b) => b.date.localeCompare(a.date));
export const services = load(import.meta.glob('../content/kinesiologia/*.js', { eager: true })).sort((a, b) => a.order - b.order);
export { default as pillar } from '../content/paginas/fisioterapia-invasiva-ecoguiada.js';
export { default as kinePillar } from '../content/paginas/kinesiologia-mendoza.js';

export const collections = { kinesiologia: services, tratamientos: treatments, lesiones: lesions, blog: posts };

// Ruta base de cada colección (la de kinesiología cuelga de la pilar /kinesiologia-mendoza/).
export const BASE = { kinesiologia: '/kinesiologia-mendoza/', tratamientos: '/tratamientos/', lesiones: '/lesiones/', blog: '/blog/' };
export const urlOf = (kind, slug) => BASE[kind] + slug + '/';

export function bySlug(kind, slug) {
  const it = collections[kind].find((x) => x.slug === slug);
  if (!it) throw new Error(`Relación rota: ${kind}/${slug}`);
  return it;
}

// Red bidireccional: relaciones declaradas + inversas (quién me declara a mí).
const LIMITS = { kinesiologia: 3, tratamientos: 4, lesiones: 9, blog: 6 };
export function relatedOf(kind, slug) {
  const self = bySlug(kind, slug);
  const out = {};
  for (const target of Object.keys(collections)) {
    const declared = (self.related?.[target] || []).filter((s) => !(target === kind && s === slug));
    const reverse = collections[target].filter((o) => o.slug !== slug && o.related?.[kind]?.includes(slug)).map((o) => o.slug);
    out[target] = [...new Set([...declared, ...reverse])].slice(0, LIMITS[target]).map((s) => bySlug(target, s));
  }
  return out;
}

export const latest = (list) => list.map((x) => x.updated || x.date).sort().pop();

export const featuredLesions = ['contractura-muscular', 'tendinitis', 'dolor-de-rodilla', 'dolor-de-hombro', 'desgarros-musculares', 'fascitis-plantar', 'tendinopatia-aquiles', 'epicondilitis']
  .map((s) => lesions.find((l) => l.slug === s))
  .filter(Boolean);

export const homePosts = ['primera-sesion-fisioterapia-invasiva', 'diferencias-entre-epi-y-puncion-seca', 'ecografia-en-fisioterapia']
  .map((s) => posts.find((p) => p.slug === s))
  .filter(Boolean);
