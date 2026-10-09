// Valida uno o más archivos de contenido: forma, enlaces internos, lenguaje prohibido y extensión.
// Uso: node scripts/check-content.js src/content/lesiones/epicondilitis.js [...]
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const slugs = (dir) => readdirSync(resolve(root, 'src/content', dir)).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));

const PLANNED = {
  kinesiologia: ["deportiva", "traumatologica", "postquirurgica", "dolor-lumbar", "dolor-cervical", "esguinces"],
  tratamientos: ['epi-electrolisis-percutanea', 'neuromodulacion-percutanea-ecoguiada', 'microelectrolisis-percutanea-mep', 'puncion-seca-ecoguiada'],
  lesiones: ['tendinopatia-aquiles', 'tendinopatia-rotuliana', 'manguito-rotador', 'epicondilitis', 'epitrocleitis', 'fascitis-plantar', 'desgarros-musculares', 'dolor-miofascial', 'fibrosis-muscular', 'ligamentarias', 'bursopatias', 'dolor-cronico-musculoesqueletico', 'contractura-muscular', 'torticolis', 'tendinitis', 'dolor-de-hombro', 'dolor-de-rodilla', 'dolor-de-cadera', 'pubalgia', 'periostitis-tibial', 'lesion-de-menisco', 'hombro-congelado', 'sindrome-del-tunel-carpiano', 'ciatica', 'hernia-de-disco', 'escoliosis', 'dolor-de-espalda', 'dolor-de-codo', 'dolor-de-muneca', 'dolor-de-tobillo', 'artrosis-de-rodilla', 'dolor-patelofemoral', 'espolon-calcaneo'],
  blog: ['primera-sesion-fisioterapia-invasiva', 'como-actua-la-epi-en-el-tendon', 'epi-para-tendinopatias', 'diferencias-entre-epi-y-puncion-seca', 'neuromodulacion-percutanea-nervio-y-dolor', 'ecografia-en-fisioterapia', 'tendinopatia-rotuliana-causas-y-rehabilitacion', 'tendinopatia-de-aquiles-guia-de-rehabilitacion', 'epicondilitis-sintomas-y-causas', 'fascitis-plantar-abordaje-desde-fisioterapia', 'puncion-seca-con-ecografia-que-cambia', 'cuando-se-recomienda-fisioterapia-invasiva', 'cuantas-sesiones-de-kinesiologia', 'kinesiologo-o-traumatologo', 'obra-social-y-orden-medica-kinesiologia', 'que-llevar-a-la-primera-sesion-de-kinesiologia', 'kinesiologia-o-fisioterapia', 'frio-o-calor-en-una-lesion', 'volver-a-entrenar-despues-de-una-lesion', 'rehabilitacion-ligamento-cruzado-anterior', 'dolor-de-rodilla-al-correr', 'que-hacer-despues-de-una-lesion', 'cuanto-tarda-en-recuperarse-una-lesion-muscular', 'contractura-o-desgarro', 'que-ayuda-a-recuperarse-de-una-lesion'],
};
for (const k of Object.keys(PLANNED)) PLANNED[k] = [...new Set([...PLANNED[k], ...slugs(k)])];

const allowed = new Set(['/', '/fisioterapia-invasiva-ecoguiada/', '/tratamientos/', '/lesiones/', '/preguntas-frecuentes/', '/sobre-mi/', '/contacto/', '/blog/', '/kinesiologia-mendoza/']);
for (const [sec, list] of Object.entries(PLANNED)) list.forEach((s) => allowed.add(`/${sec === 'kinesiologia' ? 'kinesiologia-mendoza' : sec}/${s}/`));

const FORBIDDEN = /\b(cura(?:r|ción|ciones)?|garantiza\w*|elimina definitivamente|recuperación asegurada|el mejor tratamiento|revoluci\w+|increíbles?|100 ?%|usted)\b/gi;

const REQUIRED = {
  paginas: ['path', 'title', 'description', 'h1', 'lead', 'answer', 'updated', 'seo', 'facts', 'body', 'faqs', 'waMessage'],
  kinesiologia: ['slug', 'order', 'name', 'icon', 'cardText', 'title', 'description', 'h1', 'lead', 'answer', 'updated', 'seo', 'facts', 'body', 'faqs', 'related', 'therapy', 'waMessage'],
  tratamientos: ['slug', 'order', 'name', 'shortName', 'icon', 'cardText', 'title', 'description', 'h1', 'lead', 'updated', 'seo', 'facts', 'body', 'faqs', 'related', 'procedure', 'waMessage'],
  lesiones: ['slug', 'order', 'category', 'name', 'icon', 'cardText', 'title', 'description', 'h1', 'lead', 'updated', 'seo', 'facts', 'body', 'faqs', 'related', 'condition', 'waMessage'],
  blog: ['slug', 'title', 'description', 'h1', 'lead', 'date', 'updated', 'category', 'seo', 'body', 'faqs', 'related'],
};

let failed = false;
for (const file of process.argv.slice(2)) {
  const abs = resolve(file);
  const dir = abs.replace(/\\/g, '/').match(/content\/(\w+)\//)?.[1];
  const section = REQUIRED[dir] ? dir : 'blog';
  const errors = [];
  const warns = [];
  let d;
  try {
    d = (await import(pathToFileURL(abs).href + '?t=' + Date.now())).default;
  } catch (e) {
    console.log(`✗ ${file}\n   No parsea: ${e.message}`);
    failed = true;
    continue;
  }
  for (const k of REQUIRED[section]) if (d[k] === undefined) errors.push(`falta el campo "${k}"`);
  const text = [d.title, d.description, d.h1, d.lead, d.body, ...(d.faqs || []).flatMap((f) => [f.q, f.a])].join('\n');
  for (const m of text.matchAll(/\]\((\/[^)]*)\)/g)) if (!allowed.has(m[1].split('#')[0])) errors.push(`enlace interno inválido: ${m[1]}`);
  for (const [sec, list] of Object.entries(d.related || {})) for (const s of list) if (!PLANNED[sec]?.includes(s)) errors.push(`related.${sec} inválido: ${s}`);
  for (const m of text.matchAll(FORBIDDEN)) warns.push(`lenguaje a revisar: "${m[0]}"`);
  const ctas = (d.body?.match(/\{\{CTA\}\}/g) || []).length;
  if (ctas !== 1) errors.push(`{{CTA}} debe aparecer 1 vez (aparece ${ctas})`);
  if (/\n#\s/.test(d.body || '')) errors.push('no usar "# " (H1) en el body');
  if (d.answer) {
    const n = d.answer.split(/\s+/).length;
    if (n < 35 || n > 75) warns.push(`answer de ${n} palabras (ideal 40 a 60)`);
  } else warns.push('falta "answer" (respuesta directa de 40 a 60 palabras)');
  if (/—/.test(text + (d.answer || ''))) errors.push('raya "—": usar coma, punto o dos puntos');
  if (/\b[Tt]écnicas?\b(?! (de|del) (revés|carrera|golpe|swing|lanzamiento|salto|levantamiento|sentadilla|ejecución|movimiento|remo|nado|pedaleo|empuje|tiro|juego|escalada|aterrizaje))/.test(text + (d.answer || ''))) warns.push('usar "tratamiento" en vez de "técnica"');
  const words = (d.body || '').split(/\s+/).filter(Boolean).length;
  const h2 = (d.body?.match(/^## /gm) || []).length;
  const links = (d.body?.match(/\]\(\//g) || []).length;
  if (d.description && (d.description.length < 110 || d.description.length > 175)) warns.push(`description de ${d.description.length} caracteres`);
  if (links < 4) warns.push(`solo ${links} enlaces internos en el body`);
  console.log(`${errors.length ? '✗' : '✓'} ${file} — ${words} palabras, ${h2} H2, ${links} enlaces, ${d.faqs?.length || 0} FAQs`);
  errors.forEach((e) => console.log('   ERROR ' + e));
  warns.forEach((w) => console.log('   aviso ' + w));
  if (errors.length) failed = true;
}
process.exit(failed ? 1 : 0);
