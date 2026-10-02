import config from '../../site.config.js';

export { config };

export const isPending = (v) => v == null || v === '' || (typeof v === 'string' && /\[[^\]]+\]/.test(v));
export const known = (v) => (isPending(v) ? undefined : v);

export const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const abs = (path) => config.siteUrl.replace(/\/$/, '') + path;

// Tokens editoriales disponibles en todo el contenido.
export const TOKENS = {
  CIUDAD: config.business.city,
  PROVINCIA: config.business.province,
  NOMBRE: config.professional.name,
  TITULO: config.professional.title,
  ROL: config.professional.role,
  MATRICULA: config.professional.license,
  CONSULTORIO: config.business.name,
  DIRECCION: config.business.address,
  TELEFONO: config.contact.phoneDisplay,
  HORARIOS: config.hoursText,
};

export const tokens = (s = '') => String(s).replace(/\{\{(\w+)\}\}/g, (m, k) => (k in TOKENS ? TOKENS[k] : m));

// Enlace de WhatsApp con mensaje contextual. Si el número no está cargado,
// deriva a la página de contacto (nunca genera un wa.me roto).
export function waLink(message = 'Hola, quería solicitar una evaluación.') {
  const n = (config.contact.whatsapp || '').replace(/\D/g, '');
  if (!n) return '/contacto/#turno';
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}

export const hasWhatsapp = () => Boolean((config.contact.whatsapp || '').replace(/\D/g, ''));

export function formatDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function pendingReport() {
  const out = [];
  const walk = (obj, prefix) => {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      // Solo los marcadores [ ... ]: los campos vacíos son opcionales (foto, email, analytics…).
      const marked = (x) => typeof x === 'string' && /\[[^\]]+\]/.test(x);
      if (Array.isArray(v)) v.forEach((x, i) => marked(x) && out.push(`${key}[${i}]`));
      else if (v && typeof v === 'object') walk(v, key);
      else if (marked(v)) out.push(key);
    }
  };
  walk(config, '');
  if (!hasWhatsapp()) out.push('contact.whatsapp (sin número: los CTA derivan a /contacto/)');
  if (/dominio-pendiente/.test(config.siteUrl)) out.push('siteUrl (dominio definitivo)');
  if (!config.business.geo) out.push('business.geo (coordenadas)');
  if (!config.hours.length) out.push('hours (horarios estructurados para schema)');
  return out;
}
