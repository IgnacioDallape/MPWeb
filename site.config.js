// =============================================================================
// DATOS DEL NEGOCIO — ÚNICA FUENTE DE VERDAD
// Completá estos valores una sola vez. Se propagan a todas las páginas, al
// schema.org, al footer (NAP) y al sitemap.
//
// Todo valor que contenga corchetes [ ] se considera PENDIENTE:
//   - se muestra tal cual en la web (para que sea visible que falta),
//   - se OMITE del schema.org (nunca se publican datos falsos),
//   - el build lo lista como advertencia.
//
// IMPORTANTE (SEO local): nombre, dirección y teléfono deben ser EXACTAMENTE
// iguales a los de Google Business Profile (mismas abreviaturas, mismo orden).
// =============================================================================

export default {
  // Dominio definitivo, sin barra final. Ej: 'https://www.kinesiologiaecoguiada.com.ar'
  siteUrl: 'https://www.dominio-pendiente.com.ar', // [PENDIENTE]
  lang: 'es-AR',
  locale: 'es_AR',

  professional: {
    name: 'Marcos Porretta',
    // Ej: 'Lic. en Kinesiología y Fisiatría'
    title: 'Kinesiólogo',
    // 'kinesiólogo' o 'kinesióloga' (textos de revisión de contenido y presentación)
    role: 'kinesiólogo',
    license: '[MATRÍCULA]',
    // Formación de grado y posgrado. Un ítem por línea.
    education: ['[FORMACIÓN]'],
    specializations: ['[ESPECIALIZACIONES]'],
    certifications: ['[CURSOS / CERTIFICACIONES]'],
    experience: '[EXPERIENCIA]',
  },

  business: {
    name: '[NOMBRE CONSULTORIO]',
    specialty: 'Fisioterapia Invasiva Ecoguiada',
    city: '[CIUDAD]',
    province: '[PROVINCIA]',
    country: 'AR',
    address: '[DIRECCIÓN]',
    postalCode: '[CÓDIGO POSTAL]',
    // Coordenadas exactas del consultorio (de Google Maps). null = se omiten.
    geo: null, // { lat: -34.6037, lng: -58.3816 }
    // Link "Cómo llegar" de Google Maps / Google Business Profile.
    mapsUrl: '',
    // Áreas atendidas (ciudad + localidades cercanas reales).
    areaServed: ['[CIUDAD]'],
  },

  contact: {
    // Como se muestra en la web (igual que en Google Business Profile).
    phoneDisplay: '+54 9 261 213-0504',
    // Solo dígitos, formato internacional para wa.me. Ej Argentina: 5493511234567
    whatsapp: '5492612130504',
    email: '',
    instagram: '[INSTAGRAM]', // URL completa: https://www.instagram.com/usuario/
  },

  // Horarios. Texto visible + estructura para schema (días en inglés de schema.org).
  hoursText: '[HORARIOS]',
  hours: [
    // { days: ['Monday','Tuesday','Wednesday','Thursday','Friday'], opens: '09:00', closes: '19:00' },
  ],

  // Fecha de lanzamiento: se usa como fecha de publicación por defecto.
  launchDate: '2026-10-02',

  // Analytics opcional (se carga después de la interacción para no afectar el rendimiento).
  // Ej: 'G-XXXXXXX'. Vacío = sin analytics.
  gaId: '',
};
