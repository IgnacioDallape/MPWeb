// Contenido de /llms.txt y /llms-full.txt: resumen del sitio en Markdown para asistentes de IA
// (ChatGPT, Claude, Perplexity, Gemini). Se genera desde los mismos datos que las páginas.
import { config, known, abs, tokens } from './site.js';
import { ENTITY } from './schema.js';
import { services, treatments, lesions, posts, pillar, kinePillar, urlOf } from '../data/index.js';
import { HOME_FAQS, PROCESS_FAQS } from '../data/faqs.js';

const b = config.business;
const c = config.contact;
const clean = (s = '') =>
  tokens(s)
    .replace(/^\s*\{\{CTA\}\}\s*$/gm, '')
    .replace(/\]\((\/[^)]*)\)/g, (m, p) => `](${abs(p)})`)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
const line = (name, url, text) => `- [${tokens(name)}](${abs(url)}): ${tokens(text)}`;

function facts() {
  return [
    `- Nombre: ${b.name}`,
    `- Actividad: kinesiología y fisioterapia invasiva ecoguiada`,
    `- Ubicación: ${[known(b.address), b.city, b.province, 'Argentina'].filter(Boolean).join(', ')}`,
    `- Zonas desde las que recibe pacientes: ${b.areaServed.join(', ')}`,
    `- Turnos y consultas: WhatsApp ${c.phoneDisplay} (https://wa.me/${c.whatsapp})`,
    known(config.hoursText) && `- Horarios: ${config.hoursText}`,
    known(c.instagram) && `- Instagram: ${c.instagram}`,
    `- Sitio web: ${abs('/')}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function llmsIndex() {
  return `# ${b.name}

> ${ENTITY}

${facts()}

Cada tratamiento empieza con una evaluación clínica y ecográfica. Los tratamientos con aguja (EPI, neuromodulación percutánea, MEP y punción seca) se indican solo cuando la evaluación lo justifica y siempre se integran con ejercicio terapéutico y progresión de cargas.

## Kinesiología en ${b.seoArea}

${line(kinePillar.h1, kinePillar.path, kinePillar.description)}
${services.map((x) => line(x.name, urlOf('kinesiologia', x.slug), x.description)).join('\n')}

## Fisioterapia invasiva ecoguiada

${line(pillar.h1, pillar.path, pillar.description)}
${treatments.map((t) => line(t.name, urlOf('tratamientos', t.slug), t.description)).join('\n')}

## Patologías que se tratan

${lesions.map((l) => line(l.name, urlOf('lesiones', l.slug), l.description)).join('\n')}

## Guías y artículos

${posts.map((p) => line(p.h1, urlOf('blog', p.slug), p.description)).join('\n')}

## Información

- [Preguntas frecuentes](${abs('/preguntas-frecuentes/')}): dudas sobre kinesiología, fisioterapia invasiva, sesiones y recuperación.
- [Metodología](${abs('/sobre-mi/')}): cómo se evalúa y se arma cada plan de tratamiento.
- [Contacto y turnos](${abs('/contacto/')}): WhatsApp y zonas de atención.

## Optional

- [Versión completa para asistentes](${abs('/llms-full.txt')}): el contenido de todas las páginas en un solo archivo.
`;
}

const faqBlock = (faqs = []) => (faqs.length ? `\n\n### Preguntas frecuentes\n\n${faqs.map((f) => `**${tokens(f.q)}**\n${clean(f.a)}`).join('\n\n')}` : '');
const page = (url, it) =>
  `## ${tokens(it.h1)}\n\nURL: ${abs(url)}\n\n${it.answer ? clean(it.answer) + '\n\n' : ''}${clean(it.body).replace(/^## /gm, '### ').replace(/^### (?=#)/gm, '#### ')}${faqBlock(it.faqs)}`;

export function llmsFull() {
  return [
    `# ${b.name}: contenido completo\n\n> ${ENTITY}\n\n${facts()}`,
    `## Preguntas frecuentes generales\n\n${[...HOME_FAQS, ...PROCESS_FAQS].map((f) => `**${tokens(f.q)}**\n${clean(f.a)}`).join('\n\n')}`,
    page(kinePillar.path, kinePillar),
    ...services.map((x) => page(urlOf('kinesiologia', x.slug), x)),
    page(pillar.path, pillar),
    ...treatments.map((t) => page(urlOf('tratamientos', t.slug), t)),
    ...lesions.map((l) => page(urlOf('lesiones', l.slug), l)),
    ...posts.map((p) => page(urlOf('blog', p.slug), p)),
  ].join('\n\n---\n\n') + '\n';
}
