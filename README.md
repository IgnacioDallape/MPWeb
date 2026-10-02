# Web — Fisioterapia Invasiva Ecoguiada

Sitio estático pre-renderizado, pensado para SEO local, autoridad temática y conversión por WhatsApp.
Sin framework en runtime: HTML + CSS inline + 0 KB de JavaScript en casi todas las páginas.

- Estrategia (sitemap, keywords por URL, enlazado, estructura de la home): [`docs/ESTRATEGIA-SEO.md`](docs/ESTRATEGIA-SEO.md)
- Reglas editoriales para redactar contenido nuevo: [`docs/CONTENT-BRIEF.md`](docs/CONTENT-BRIEF.md)

## Comandos

```bash
npm install
npm run dev       # build + servidor en http://localhost:4321 + rebuild al guardar
npm run build     # genera dist/ (listo para subir)
npm run images    # optimiza fotos de src/images/ y regenera íconos + imagen Open Graph
```

## 1. Completar los datos (una sola vez)

Todo está en **`site.config.js`**. Cada valor entre corchetes (`[CIUDAD]`, `[MATRÍCULA]`…) es un dato pendiente:

- se ve resaltado en amarillo en la web para que no pase desapercibido,
- se **omite** del schema.org (nunca se publican datos falsos),
- el build lo lista al final como advertencia.

Al completar `business.city`, la ciudad aparece automáticamente en los titles, H1 y textos donde tiene sentido (el contenido usa el token `{{CIUDAD}}`).

> **NAP:** nombre, dirección y teléfono deben ser idénticos a Google Business Profile.

Después de cargar los datos, corré `npm run images` para regenerar la imagen Open Graph.

## 2. Fotos reales

Colocá las fotos en `src/images/` (JPG/PNG de buena resolución) y corré `npm run images`. Se generan versiones AVIF, WebP y JPG en 480/960/1440 px.

| Archivo | Dónde se usa |
|---|---|
| `src/images/profesional.jpg` | Home (sección profesional), Sobre mí y schema `Person` — ideal: retrato vertical 4:5, con el ecógrafo |

Para usar otras fotos en una plantilla: `picture('nombre-archivo', 'texto alternativo descriptivo')` (en `src/lib/components.js`). Prioridad: ecógrafo en uso, evaluación, consultorio real, movimiento/rehabilitación. Evitar stock genérico.

## 3. Agregar contenido

Un archivo = una página. El build lo suma a índices, relacionados, sitemap, breadcrumbs y schema.

| Tipo | Carpeta | URL resultante |
|---|---|---|
| Artículo | `src/content/blog/<slug>.js` | `/blog/<slug>/` |
| Lesión | `src/content/lesiones/<slug>.js` | `/lesiones/<slug>/` |
| Tratamiento | `src/content/tratamientos/<slug>.js` | `/tratamientos/<slug>/` |

Copiá un archivo existente del mismo tipo como plantilla y validalo:

```bash
node scripts/check-content.js src/content/blog/mi-articulo.js
```

`related` crea la red de enlaces **en ambos sentidos**: si un artículo declara la lesión `epicondilitis`, esa lesión muestra el artículo automáticamente. Al revisar una página, actualizá `updated` (se refleja en la página, el schema y el `lastmod` del sitemap). Con `draft: true` un archivo no se publica.

## 4. Validaciones del build

El build falla si encuentra: enlaces internos rotos, assets inexistentes, títulos o descripciones duplicados, páginas sin H1 o con más de uno, imágenes sin `alt`. Avisa sobre longitudes de title/description, páginas huérfanas y datos pendientes.

## 5. Publicación

Cualquier hosting estático sirve `dist/`:

- **Vercel**: importar el repo (usa `vercel.json`).
- **Netlify / Cloudflare Pages**: build `npm run build`, carpeta `dist` (usa `public/_headers`).

Después de publicar:

1. Cambiar `siteUrl` al dominio definitivo y volver a publicar.
2. Google Search Console → verificar dominio → enviar `https://<dominio>/sitemap.xml`.
3. Google Business Profile: mismo NAP, categoría principal *Fisioterapeuta*, enlace a la web.
4. Validar el schema en <https://validator.schema.org> y <https://search.google.com/test/rich-results>.

## Estructura

```
site.config.js            datos del negocio (única fuente de verdad)
src/content/              contenido editorial (tratamientos, lesiones, blog, pilar)
src/templates/            plantillas de página (home, detalle, hubs, contacto…)
src/lib/                  layout, schema.org, markdown, íconos, ilustraciones SVG
src/styles/site.css       sistema visual (se inyecta inline y minificado)
public/                   archivos estáticos (favicon, manifest, imágenes generadas)
scripts/                  build, servidor local, imágenes, validador de contenido
```
