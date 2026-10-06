// Renders 3D (public/img/3d/*.webp), generados con scripts/render-assets.mjs a partir de src/scripts/models/.
export const TREATMENT_RENDER = {
  'epi-electrolisis-percutanea': 'epi',
  'microelectrolisis-percutanea-mep': 'mep',
  'neuromodulacion-percutanea-ecoguiada': 'nmp',
  'puncion-seca-ecoguiada': 'puncion',
};
// Cada patología tiene su propio render, con el mismo nombre que su slug.
export const lesionRender = (slug) => slug;
// Render representativo de cada categoría (fichas de la home).
export const CATEGORY_RENDER = {
  tendinosas: 'tendinopatia-aquiles',
  fascia: 'fascitis-plantar',
  musculares: 'desgarros-musculares',
  ligamentarias: 'ligamentarias',
  bursas: 'bursopatias',
  dolor: 'dolor-cronico-musculoesqueletico',
};
export const renderSrc = (name, size = 'sm') => (name ? `/img/3d/${name}${size === 'sm' ? '-sm' : ''}.webp` : undefined);
