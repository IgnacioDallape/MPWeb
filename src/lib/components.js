// Helpers que devuelven HTML como string (para insertar dentro del contenido markdown
// o reutilizar desde schema.js). Los componentes visuales viven en src/components/*.astro.
import { esc, waLink } from './site.js';
import { icon } from './icons.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Imágenes responsive generadas por `npm run images`.
const manifestPath = resolve(process.cwd(), 'public/img/manifest.json');
const IMAGES = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

export const imagePath = (name) => (IMAGES[name] ? `/img/${name}-${IMAGES[name].widths.at(-1)}.jpg` : undefined);

export function picture(name, alt, { sizes = '(min-width: 960px) 50vw, 100vw', priority = false, cls = '' } = {}) {
  const img = IMAGES[name];
  if (!img) return '';
  const set = (ext) => img.widths.map((w) => `/img/${name}-${w}.${ext} ${w}w`).join(', ');
  const largest = img.widths[img.widths.length - 1];
  const height = Math.round((img.height / img.width) * largest);
  return `<picture${cls ? ` class="${cls}"` : ''}><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img class="h-full w-full object-cover" src="/img/${name}-${largest}.jpg" srcset="${set('jpg')}" sizes="${sizes}" width="${largest}" height="${height}" alt="${esc(alt)}" ${priority ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`;
}

// Sellos de certificación (MVClinic). Imágenes en public/img/cert-*.{webp,png}.
export const CERTS = {
  ecografia: 'Ecografía musculoesquelética',
  electrolisis: 'Electrólisis percutánea',
  neuromodulacion: 'Neuromodulación percutánea',
};
export const TREATMENT_CERT = {
  'epi-electrolisis-percutanea': 'electrolisis',
  'microelectrolisis-percutanea-mep': 'electrolisis',
  'neuromodulacion-percutanea-ecoguiada': 'neuromodulacion',
};

export function certBadge(key, size = 96, cls = '') {
  return `<picture class="block flex-none"><source type="image/webp" srcset="/img/cert-${key}.webp"><img class="cert ${cls}" style="width:${size}px;height:${size}px" src="/img/cert-${key}.png" width="${size}" height="${size}" alt="Sello Certified Quality en ${esc(CERTS[key])} – MVClinic, Institute of Invasive Physiotherapy" loading="lazy" decoding="async"></picture>`;
}

// Bloque de conversión que reemplaza {{CTA}} dentro del contenido.
export function ctaInline({
  waMessage,
  title = '¿Querés saber si este abordaje es adecuado para tu caso?',
  text = 'El primer paso es una evaluación: historia clínica, exploración y ecografía para entender qué estructura está implicada.',
  button = 'Consultar por mi lesión',
} = {}) {
  return `<aside class="not-prose cta-inline" aria-label="Solicitar evaluación"><p><strong>${esc(title)}</strong>${esc(text)}</p><a class="btn btn-glow btn-shine" href="${esc(waLink(waMessage))}">${icon('whatsapp', { size: 20 })}${esc(button)}</a></aside>`;
}
