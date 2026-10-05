# Web — Fisioterapia Invasiva Ecoguiada

Sitio construido con **Astro 7 + Tailwind CSS 4 + Three.js + GSAP + Lenis**, pensado para SEO local, autoridad temática y conversión por WhatsApp.

- **Astro** pre-renderiza todo a HTML estático: SEO intacto, sin framework en el navegador.
- **Three.js**: escena 3D en tiempo real en el hero (tendón con fibras, sonda ecográfica, aguja con partículas de energía, bloom) que cuenta el tratamiento al hacer scroll. Se carga con la primera interacción del usuario; mientras tanto se muestra un render pre-generado (`public/img/hero-3d*.webp`).
- **GSAP + ScrollTrigger** coreografían la cámara 3D con el scroll (se cargan junto con la escena).
- **Lenis** (scroll suave en escritorio) + IntersectionObserver y transiciones CSS para las animaciones de entrada.
- Lighthouse (build de producción): home 99 mobile / 100 desktop; páginas internas 99–100.

- Estrategia (sitemap, keywords por URL, enlazado, estructura de la home): [`docs/ESTRATEGIA-SEO.md`](docs/ESTRATEGIA-SEO.md)
- Reglas editoriales para redactar contenido nuevo: [`docs/CONTENT-BRIEF.md`](docs/CONTENT-BRIEF.md)

## Comandos

```bash
npm install
npm run dev       # servidor de desarrollo en http://localhost:4321
npm run build     # genera dist/ + sitemap.xml + robots.txt + validación SEO
npm run preview   # sirve dist/ localmente
npm run images    # optimiza fotos de src/images/ y regenera íconos + imagen Open Graph
```

### Regenerar los renders 3D (imagen previa del hero)

Con `npm run dev` corriendo, capturar la escena con `node scripts/shot.mjs "http://localhost:4321/?render=poster" poster.png 1600 900 5000` (y 780×1500 para la versión mobile) y convertirla a `public/img/hero-3d.webp/.jpg` y `public/img/hero-3d-mobile.webp/.jpg`.

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

Al terminar `npm run build`, la integración `scripts/postbuild.js` reemplaza tokens, resalta los datos pendientes, genera `sitemap.xml` y `robots.txt`, y **falla** si encuentra: enlaces internos rotos, assets inexistentes, títulos o descripciones duplicados, páginas sin un único H1 o imágenes sin `alt`.

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
astro.config.mjs          Astro + Tailwind + integración SEO de postbuild
src/content/              contenido editorial (tratamientos, lesiones, blog, pilar)
src/data/                 carga de contenido, red de enlaces, menú, FAQs, legales
src/pages/                rutas (home, pilar, índices, [slug] dinámicos, contacto…)
src/components/           componentes Astro (header, hero, cards, FAQ, CTA, sellos…)
src/layouts/Base.astro    <head> SEO, schema.org, header, footer, barra móvil
src/scripts/              motion.js (animaciones), xp.js + scene3d.js (experiencia 3D)
src/styles/global.css     sistema visual Tailwind (dark tech médico)
src/lib/                  schema.org, markdown, íconos, ilustraciones SVG
public/                   favicon, manifest, imágenes, sellos, renders 3D
scripts/                  postbuild SEO, imágenes, capturas (shot.mjs), validador de contenido
```
