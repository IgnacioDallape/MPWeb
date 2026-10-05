// Capa de datos: carga el contenido editorial (src/content) y arma la red semántica.
const load = (mods) =>
  Object.values(mods)
    .map((m) => m.default)
    .filter((x) => !x.draft);

export const CATEGORIES = {
  tendinosas: { label: 'Lesiones tendinosas', icon: 'tendon', intro: 'Tendón de Aquiles, rotuliano, manguito rotador, epicondilitis, epitrocleitis y otras tendinopatías.' },
  fascia: { label: 'Fascia plantar', icon: 'foot', intro: 'Dolor en el talón y la planta del pie, especialmente en los primeros pasos.' },
  musculares: { label: 'Lesiones musculares', icon: 'muscle', intro: 'Desgarros, dolor miofascial y fibrosis tras lesiones previas.' },
  ligamentarias: { label: 'Lesiones ligamentarias', icon: 'joint', intro: 'Esguinces y lesiones de ligamentos con dolor o inestabilidad persistente.' },
  bursas: { label: 'Bursopatías', icon: 'layers', intro: 'Bursitis de cadera, hombro, rodilla, codo y talón.' },
  dolor: { label: 'Dolor musculoesquelético persistente', icon: 'pulse', intro: 'Dolor que se mantiene en el tiempo y necesita un abordaje integral.' },
};
const catOrder = Object.keys(CATEGORIES);

export const treatments = load(import.meta.glob('../content/tratamientos/*.js', { eager: true })).sort((a, b) => a.order - b.order);
export const lesions = load(import.meta.glob('../content/lesiones/*.js', { eager: true })).sort(
  (a, b) => catOrder.indexOf(a.category) - catOrder.indexOf(b.category) || a.order - b.order
);
export const posts = load(import.meta.glob('../content/blog/*.js', { eager: true })).sort((a, b) => b.date.localeCompare(a.date));
export { default as pillar } from '../content/paginas/fisioterapia-invasiva-ecoguiada.js';

export const collections = { tratamientos: treatments, lesiones: lesions, blog: posts };

export function bySlug(kind, slug) {
  const it = collections[kind].find((x) => x.slug === slug);
  if (!it) throw new Error(`Relación rota: ${kind}/${slug}`);
  return it;
}

// Red bidireccional: relaciones declaradas + inversas (quién me declara a mí).
const LIMITS = { tratamientos: 4, lesiones: 9, blog: 6 };
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

export const featuredLesions = ['tendinopatia-aquiles', 'tendinopatia-rotuliana', 'manguito-rotador', 'epicondilitis', 'fascitis-plantar', 'desgarros-musculares']
  .map((s) => lesions.find((l) => l.slug === s))
  .filter(Boolean);

export const homePosts = ['primera-sesion-fisioterapia-invasiva', 'diferencias-entre-epi-y-puncion-seca', 'ecografia-en-fisioterapia']
  .map((s) => posts.find((p) => p.slug === s))
  .filter(Boolean);
