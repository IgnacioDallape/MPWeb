// Avisa a Bing, Yandex, Seznam y Naver (IndexNow) que hay URLs nuevas o actualizadas.
// Bing alimenta las búsquedas de ChatGPT y Copilot, así que conviene correrlo después de cada deploy.
// Uso: npm run build && node scripts/indexnow.mjs            (todas las URLs del sitemap)
//      node scripts/indexnow.mjs /kinesiologia-mendoza/ ...  (solo esas rutas)
// La clave es el nombre del archivo public/<clave>.txt (su contenido es la misma clave).
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import config from '../site.config.js';

const root = resolve(import.meta.dirname, '..');
const site = config.siteUrl.replace(/\/$/, '');
if (/dominio-pendiente/.test(site)) {
  console.error('Primero cargá el dominio definitivo en site.config.js (siteUrl).');
  process.exit(1);
}
const keyFile = readdirSync(resolve(root, 'public')).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
const key = keyFile.replace('.txt', '');

const paths = process.argv.slice(2);
const urlList = paths.length
  ? paths.map((p) => site + p)
  : [...readFileSync(resolve(root, 'dist/sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(site).host, key, keyLocation: `${site}/${keyFile}`, urlList }),
});
console.log(`IndexNow: ${res.status} ${res.statusText} · ${urlList.length} URLs`);
