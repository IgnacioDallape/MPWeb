// Renders 3D (public/img/3d/*.webp, generados con scripts/render-assets.mjs).
export const TREATMENT_RENDER = {
  'epi-electrolisis-percutanea': 'epi',
  'microelectrolisis-percutanea-mep': 'mep',
  'neuromodulacion-percutanea-ecoguiada': 'nmp',
  'puncion-seca-ecoguiada': 'puncion',
};
// Las categorías de patologías usan el render con su mismo nombre.
export const CATEGORY_RENDER = { tendinosas: 'tendinosas', fascia: 'fascia', musculares: 'musculares', ligamentarias: 'ligamentarias', bursas: 'bursas', dolor: 'dolor' };
export const renderSrc = (name, size = 'sm') => (name ? `/img/3d/${name}${size === 'sm' ? '-sm' : ''}.webp` : undefined);
