# Checklist SEO local y SEO para IA (fuera del sitio)

Lo que no se puede hacer desde el código y más pesa para aparecer en Google Maps, en "kinesiólogo cerca mío" y en las respuestas de ChatGPT, Perplexity, Gemini y Copilot.

## 1. Antes de todo

- [ ] **Dominio propio** (ej. `mpstudio.com.ar`). Cargarlo en `site.config.js` → `siteUrl` y conectarlo en Vercel. Lo que se posicione en `*.vercel.app` se pierde al cambiar de dominio.
- [ ] **Datos en `site.config.js`:** dirección, código postal, coordenadas (`geo`), link de Google Maps (`mapsUrl`), horarios (`hoursText` y `hours`), Instagram.

## 2. Google Business Profile (lo más importante para búsquedas locales)

- [ ] Crear o reclamar la ficha en business.google.com y verificarla.
- [ ] Nombre exacto: **MP Studio** (sin agregar keywords al nombre: Google lo penaliza).
- [ ] Categoría principal: **Kinesiólogo** / Fisioterapeuta. Secundarias: Clínica de fisioterapia, Servicio de rehabilitación.
- [ ] Dirección, teléfono (+54 9 261 213-0504) y horarios **idénticos** a los de la web.
- [ ] Descripción: usar la misma frase de entidad del sitio (constante `ENTITY` en `src/lib/schema.js`).
- [ ] Servicios: cargar los 6 de kinesiología y los 4 tratamientos con el mismo nombre que en la web, cada uno con su URL.
- [ ] Área de servicio: Luján de Cuyo, Chacras de Coria, Godoy Cruz, Mendoza, Maipú, Guaymallén, Las Heras.
- [ ] Fotos reales: fachada, sala, ecógrafo, camilla. Subir 2 o 3 nuevas por mes.
- [ ] Botón de WhatsApp y enlace a la web.
- [ ] Publicaciones (Google Posts) cada 1 o 2 semanas, enlazando a los artículos del blog.
- [ ] Preguntas y respuestas: cargar 5 a 8 preguntas frecuentes del sitio.
- [ ] Pasar la URL de la ficha para sumarla al `sameAs` del schema.

## 3. Reseñas

- [ ] Pedir reseña a cada paciente al terminar el tratamiento (link directo de reseña de Google por WhatsApp).
- [ ] Responder todas las reseñas, sin datos de salud del paciente.
- [ ] Buscar reseñas constantes en el tiempo, no muchas de golpe. Que mencionen naturalmente el servicio y la zona ("kinesiología en Luján de Cuyo", "rehabilitación de rodilla").

## 4. Consistencia de la entidad (NAP)

Mismo nombre, dirección, teléfono y descripción en todos lados:

- [ ] Instagram (bio + link a la web).
- [ ] Facebook / Meta Business.
- [ ] Apple Maps (Apple Business Connect) y Bing Places (se importa desde Google Business Profile).
- [ ] Directorios de salud: Doctoralia y guías de prestadores de las obras sociales con las que se trabaje.
- [ ] Colegio de Kinesiólogos de Mendoza o directorios profesionales, si permiten listar el consultorio.
- [ ] Guías locales de Mendoza.

## 5. Buscadores y herramientas

- [ ] **Google Search Console:** verificar el dominio, enviar `sitemap.xml`, revisar indexación cada mes.
- [ ] **Bing Webmaster Tools:** importar desde Search Console y enviar el sitemap. Bing es la fuente de ChatGPT y Copilot.
- [ ] Correr `npm run build && npm run indexnow` después de cada cambio importante (requiere el dominio definitivo).
- [ ] (Opcional) Google Analytics: cargar el ID en `site.config.js` → `gaId`.

## 6. Menciones y enlaces (autoridad)

- [ ] Clubes, gimnasios, boxes de crossfit y grupos de running de la zona: convenios, charlas o notas con enlace a la web.
- [ ] Notas en medios locales de Mendoza sobre lesiones deportivas.
- [ ] Traumatólogos y médicos deportólogos que deriven: enlace desde sus sitios o perfiles.

## 7. Seguimiento del SEO para IA

- [ ] Una vez por mes, preguntar en ChatGPT, Perplexity, Gemini y Copilot: "¿dónde hacer kinesiología en Mendoza?", "kinesiólogo en Luján de Cuyo", "¿quién hace EPI en Mendoza?". Anotar si aparece MP Studio y qué fuentes citan.
- [ ] Si citan directorios o reseñas de terceros, priorizar estar bien en esos sitios.
