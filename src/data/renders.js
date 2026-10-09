// Renders 3D (public/img/3d/*.webp), generados con scripts/render-assets.mjs a partir de src/scripts/models/.
export const TREATMENT_RENDER = {
  'epi-electrolisis-percutanea': 'epi',
  'microelectrolisis-percutanea-mep': 'mep',
  'neuromodulacion-percutanea-ecoguiada': 'nmp',
  'puncion-seca-ecoguiada': 'puncion',
};
// Servicios de kinesiología: reutilizan el render anatómico más cercano.
export const SERVICE_RENDER = {
  deportiva: 'musculares',
  traumatologica: 'manguito-rotador',
  postquirurgica: 'tendinopatia-rotuliana',
  'dolor-lumbar': 'dolor',
  'dolor-cervical': 'dolor-miofascial',
  esguinces: 'ligamentarias',
};
// Cada patología tiene su propio render, con el mismo nombre que su slug.
// Las patologías sin render propio usan el más cercano.
const LESION_FALLBACK = {
  'contractura-muscular': 'dolor-miofascial',
  torticolis: 'dolor-miofascial',
  tendinitis: 'tendinosas',
  'dolor-de-hombro': 'manguito-rotador',
  'dolor-de-rodilla': 'tendinopatia-rotuliana',
  'dolor-de-cadera': 'bursas',
  pubalgia: 'musculares',
  'periostitis-tibial': 'fibrosis-muscular',
  'lesion-de-menisco': 'ligamentarias',
  'hombro-congelado': 'manguito-rotador',
  'sindrome-del-tunel-carpiano': 'nmp',
};
export const lesionRender = (slug) => LESION_FALLBACK[slug] || slug;
// Render representativo de cada categoría (fichas de la home).
export const CATEGORY_RENDER = {
  tendinosas: 'tendinopatia-aquiles',
  musculares: 'desgarros-musculares',
  ligamentarias: 'ligamentarias',
  bursas: 'bursopatias',
  zonas: 'manguito-rotador',
  sobrecarga: 'fascitis-plantar',
  articulares: 'ligamentarias',
  nerviosas: 'nmp',
  dolor: 'dolor-cronico-musculoesqueletico',
};
export const renderSrc = (name, size = 'sm') => (name ? `/img/3d/${name}${size === 'sm' ? '-sm' : ''}.webp` : undefined);
