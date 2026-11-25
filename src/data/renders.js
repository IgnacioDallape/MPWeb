// Renders 3D (public/img/3d/*.webp), generados con scripts/render-assets.mjs a partir de src/scripts/models/.
// Fotos reales del consultorio (src/images): se muestran en la portada del tratamiento.
export const TREATMENT_PHOTO = {
  'epi-electrolisis-percutanea': ['foto-epi', 'Electrólisis percutánea intratisular (EPI) guiada con ecografía en MP Studio'],
  'microelectrolisis-percutanea-mep': ['foto-microelectrolisis', 'Agujas de microelectrólisis percutánea (MEP) conectadas al equipo en MP Studio'],
  'puncion-seca-ecoguiada': ['foto-puncion-seca', 'Punción seca ecoguiada: agujas finas en el músculo con la sonda ecográfica, en MP Studio'],
  'neuromodulacion-percutanea-ecoguiada': ['foto-neuromodulacion', 'Neuromodulación percutánea ecoguiada en el antebrazo, con el ecógrafo de fondo, en MP Studio'],
};

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
  esguinces: 'ligamentarias',
};
// Cada patología tiene su propio render, con el mismo nombre que su slug.
// Las patologías sin render propio usan el más cercano.
const LESION_FALLBACK = {
  'contractura-muscular': 'dolor-miofascial',
  tendinitis: 'tendinosas',
  'dolor-de-hombro': 'manguito-rotador',
  'dolor-de-rodilla': 'tendinopatia-rotuliana',
  'dolor-de-cadera': 'bursas',
  pubalgia: 'musculares',
  'periostitis-tibial': 'fibrosis-muscular',
  'sindrome-del-tunel-carpiano': 'nmp',
  'ligamento-colateral-medial': 'ligamentarias',
  'ligamento-peroneo-astragalino-anterior': 'ligamentarias',
  'dolor-de-espalda': 'dolor-cronico-musculoesqueletico',
  'dolor-de-codo': 'epicondilitis',
  'dolor-de-muneca': 'epitrocleitis',
  'dolor-de-tobillo': 'ligamentarias',
};
export const lesionRender = (slug) => LESION_FALLBACK[slug] || slug;
// Render representativo de cada categoría (fichas de la home).
export const CATEGORY_RENDER = {
  tendinosas: 'tendinopatia-aquiles',
  musculares: 'desgarros-musculares',
  ligamentarias: 'ligamentarias',
  zonas: 'manguito-rotador',
  sobrecarga: 'fascitis-plantar',
  nerviosas: 'nmp',
  dolor: 'dolor-cronico-musculoesqueletico',
};
export const renderSrc = (name, size = 'sm') => (name ? `/img/3d/${name}${size === 'sm' ? '-sm' : ''}.webp` : undefined);
