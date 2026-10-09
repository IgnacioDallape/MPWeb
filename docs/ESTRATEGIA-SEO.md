# Estrategia SEO y arquitectura — Fisioterapia Invasiva Ecoguiada

Documento de planificación previo al desarrollo. Define el sitemap, la arquitectura de información, las keywords por URL, la estrategia de enlazado interno y la estructura visual de la home.

> Los datos del negocio que todavía no existen se marcan como `[PENDIENTE]` o con su variable (`[CIUDAD]`, `[NOMBRE PROFESIONAL]`…). Se completan **una sola vez** en `site.config.js` y se propagan a todo el sitio, al schema y al sitemap.

---

## 1. Sitemap completo

```
/                                                   Home
/fisioterapia-invasiva-ecoguiada/                   Página pilar (URL SEO principal)
/tratamientos/                                      Índice de tratamientos
  /tratamientos/epi-electrolisis-percutanea/
  /tratamientos/neuromodulacion-percutanea-ecoguiada/
  /tratamientos/microelectrolisis-percutanea-mep/
  /tratamientos/puncion-seca-ecoguiada/
/lesiones/                                          Índice de lesiones (agrupado por categoría)
  /lesiones/tendinopatia-aquiles/
  /lesiones/tendinopatia-rotuliana/
  /lesiones/manguito-rotador/
  /lesiones/epicondilitis/
  /lesiones/epitrocleitis/
  /lesiones/fascitis-plantar/
  /lesiones/desgarros-musculares/
  /lesiones/dolor-miofascial/
  /lesiones/fibrosis-muscular/
  /lesiones/ligamentarias/
  /lesiones/bursopatias/
  /lesiones/dolor-cronico-musculoesqueletico/
/preguntas-frecuentes/
/sobre-mi/
/contacto/
/blog/
  /blog/primera-sesion-fisioterapia-invasiva/
  /blog/como-actua-la-epi-en-el-tendon/
  /blog/epi-para-tendinopatias/
  /blog/diferencias-entre-epi-y-puncion-seca/
  /blog/neuromodulacion-percutanea-nervio-y-dolor/
  /blog/ecografia-en-fisioterapia/
  /blog/tendinopatia-rotuliana-causas-y-rehabilitacion/
  /blog/tendinopatia-de-aquiles-guia-de-rehabilitacion/
  /blog/epicondilitis-sintomas-y-causas/
  /blog/fascitis-plantar-abordaje-desde-fisioterapia/
  /blog/puncion-seca-con-ecografia-que-cambia/
  /blog/cuando-se-recomienda-fisioterapia-invasiva/
/aviso-legal/                    (noindex, fuera del sitemap)
/politica-de-privacidad/         (noindex, fuera del sitemap)
/404.html
/sitemap.xml   /robots.txt       (generados automáticamente en cada build)
```

**Escalabilidad:** agregar un artículo, tratamiento o lesión = agregar un archivo en `src/content/<sección>/`. El build lo incorpora a índices, menús de relacionados, sitemap, breadcrumbs y schema sin tocar el diseño.

---

## 2. Arquitectura SEO (modelo hub & spoke)

```
                         HOME  (entidad: profesional + consultorio + especialidad + [CIUDAD])
                           │
              /fisioterapia-invasiva-ecoguiada/   ← PILAR (topical hub)
               │                         │
      /tratamientos/ (hub)          /lesiones/ (hub)
       ├ EPI ◄───────────────────────► tendinopatías (Aquiles, rotuliana, manguito, epicondilitis, epitrocleitis)
       ├ MEP ◄───────────────────────► fascitis plantar, bursopatías, fibrosis, ligamentarias
       ├ NMP-e ◄─────────────────────► dolor persistente, dolor miofascial, epicondilitis
       └ Punción seca ◄──────────────► dolor miofascial, desgarros, fibrosis
               ▲                         ▲
               └────────── /blog/ ───────┘   (contenido informacional que alimenta autoridad
                                              y deriva a tratamiento/lesión → evaluación)
```

**Principios:**

1. **Una intención = una URL.** Cada página responde a una intención concreta. Las páginas de lesión tienen intención *"tratamiento de X (en [CIUDAD])"*; los artículos del blog tienen intención *informacional* (síntomas, causas, mecanismo, comparativas, qué esperar). Así se evita canibalización.
2. **Ajustes sobre la lista original de artículos** para no competir con las páginas comerciales:
   - "¿Qué es la fisioterapia invasiva ecoguiada?" → ya lo responde la **pilar**. El artículo pasa a ser *"Primera sesión de fisioterapia invasiva ecoguiada: qué esperar"*.
   - "¿Qué es la EPI?" → lo responde la página de **tratamiento**. El artículo pasa a *"Cómo actúa la EPI sobre el tendón"* (mecanismo en profundidad).
   - "¿Qué es la neuromodulación percutánea?" → idem; el artículo pasa a *"Neuromodulación percutánea: cómo actúa sobre el nervio, el músculo y el dolor"*.
   - "Punción seca ecoguiada: qué es" → el artículo pasa a *"Punción seca con y sin ecografía: qué cambia"*.
   - "Tratamiento de la tendinopatía rotuliana / Aquiles / fascitis" → los artículos se enfocan en causas, carga y rehabilitación; la página `/lesiones/` es la que trabaja *"tratamiento"*.
3. **Profundidad > volumen.** No hay páginas de ciudad duplicadas ("fisioterapia en barrio X"). El SEO local se construye con NAP consistente, Google Business Profile, schema `Physiotherapy` y menciones naturales de `[CIUDAD]` en title, H1/lead de páginas comerciales y bloque de contacto.
4. **E-E-A-T explícito:** autor/revisor en cada página clínica, matrícula visible, fechas de publicación y actualización, página "Sobre mí" con formación, y lenguaje prudente (sin "cura", "garantiza", "definitivo").

---

## 3. Keywords por URL

Formato: **KW primaria** · secundarias · intención · entidades relacionadas · FAQs objetivo · enlaces salientes.

### `/` — Home
- **Primaria:** fisioterapia invasiva ecoguiada en [CIUDAD]
- **Secundarias:** kinesiólogo fisioterapia invasiva [CIUDAD], kinesiología invasiva ecoguiada, fisioterapia con ecógrafo, rehabilitación deportiva [CIUDAD]
- **Intención:** navegacional/transaccional local ("quién lo hace cerca mío y cómo pido turno").
- **Entidades:** kinesiólogo, ecografía musculoesquelética, EPI, NMP, MEP, punción seca, tendinopatía, lesión deportiva, [CIUDAD], [PROVINCIA].
- **Enlaza a:** pilar, 4 tratamientos, hub lesiones + 6 lesiones principales, sobre mí, FAQ, contacto, 3 artículos.

### `/fisioterapia-invasiva-ecoguiada/` — Pilar
- **Primaria:** fisioterapia invasiva ecoguiada
- **Secundarias:** kinesiología invasiva ecoguiada, fisioterapia ecoguiada, kinesiología ecoguiada, tratamiento ecoguiado, fisioterapia invasiva, fisioterapia con ecógrafo, fisioterapia invasiva en [CIUDAD]
- **Intención:** informacional-comercial (entender la técnica antes de consultar).
- **Entidades:** ecografía musculoesquelética, aguja de acupuntura/filiforme, corriente galvánica, sistema nervioso periférico, tendón, fascia, carga progresiva, ejercicio terapéutico.
- **FAQs:** qué es, si duele, si es segura, por qué con ecografía, quién puede realizarla, cuántas sesiones, contraindicaciones.
- **Enlaza a:** los 4 tratamientos, hub lesiones + todas las lesiones por categoría, artículos 1, 6, 12, contacto.

### `/tratamientos/` — Hub
- **Primaria:** tratamientos de fisioterapia invasiva
- **Secundarias:** técnicas de fisioterapia invasiva, EPI MEP neuromodulación punción seca
- **Intención:** comparativa/navegacional. **Enlaza a:** 4 tratamientos, pilar, artículo 4 (EPI vs punción seca).

### `/tratamientos/epi-electrolisis-percutanea/`
- **Primaria:** EPI electrólisis percutánea intratisular
- **Secundarias:** EPI fisioterapia, electrólisis percutánea, tratamiento EPI, EPI tendón, EPI tendinopatía, EPI en [CIUDAD]
- **Intención:** comercial-informacional ("qué es, para qué sirve, cuántas sesiones, dónde lo hacen").
- **Entidades:** corriente galvánica, reacción electroquímica, tendinosis/degeneración tendinosa, respuesta inflamatoria controlada, regeneración del tejido, ecografía, ejercicio excéntrico/isométrico, carga progresiva.
- **FAQs:** ¿duele?, ¿cuántas sesiones?, ¿puedo entrenar después?, ¿diferencia con punción seca?, contraindicaciones.
- **Enlaza a:** Aquiles, rotuliana, epicondilitis, epitrocleitis, manguito rotador, fascitis plantar, fibrosis; MEP (alternativa), pilar; artículos 2, 3, 4.

### `/tratamientos/neuromodulacion-percutanea-ecoguiada/`
- **Primaria:** neuromodulación percutánea ecoguiada
- **Secundarias:** neuromodulación percutánea, NMP-e, NMP, neuromodulación fisioterapia, neuromodulación en [CIUDAD]
- **Intención:** comercial-informacional.
- **Entidades:** nervio periférico, estimulación eléctrica, respuesta motora/sensitiva, dolor persistente, control motor, inhibición muscular, ecografía.
- **Enlaza a:** dolor crónico musculoesquelético, dolor miofascial, epicondilitis, tendinopatía rotuliana, manguito rotador, desgarros; pilar; artículo 5.

### `/tratamientos/microelectrolisis-percutanea-mep/`
- **Primaria:** microelectrólisis percutánea MEP
- **Secundarias:** micro electrólisis percutánea, MEP fisioterapia, MEP en [CIUDAD], microamperios
- **Entidades:** corriente galvánica de baja intensidad (µA), tejido blando, cicatriz, fibrosis, mejor tolerancia.
- **Enlaza a:** fibrosis muscular, fascitis plantar, bursopatías, ligamentarias, tendinopatías; EPI; pilar.

### `/tratamientos/puncion-seca-ecoguiada/`
- **Primaria:** punción seca ecoguiada
- **Secundarias:** punción seca, punción seca muscular, puntos gatillo, dolor miofascial, punción seca en [CIUDAD]
- **Entidades:** punto gatillo miofascial, respuesta de espasmo local, músculos profundos, estructuras de riesgo (pleura, vasos, nervios), ecografía.
- **Enlaza a:** dolor miofascial, desgarros, fibrosis, dolor crónico; EPI (comparativa); artículos 4, 11.

### `/lesiones/` — Hub
- **Primaria:** lesiones que trata la fisioterapia invasiva
- **Secundarias:** tratamiento de tendinopatías, lesiones musculares, lesiones deportivas [CIUDAD]
- **Enlaza a:** las 12 lesiones agrupadas (tendinosas, fascia, musculares, ligamentarias, bursas, dolor persistente).

### Lesiones (intención: "tratamiento de X", con [CIUDAD] en title)

| URL | KW primaria | Secundarias | Tratamientos enlazados | Blog enlazado |
|---|---|---|---|---|
| `/lesiones/tendinopatia-aquiles/` | tratamiento tendinopatía de Aquiles | fisioterapia tendón de Aquiles, tendinitis aquílea, dolor en el talón al correr | EPI, MEP | 3, 8 |
| `/lesiones/tendinopatia-rotuliana/` | tratamiento tendinopatía rotuliana | rodilla de saltador, tendinitis rotuliana, dolor debajo de la rótula | EPI, NMP-e | 3, 7 |
| `/lesiones/manguito-rotador/` | tratamiento manguito rotador | tendinopatía del supraespinoso, dolor de hombro al elevar el brazo | EPI, NMP-e, punción seca | 3 |
| `/lesiones/epicondilitis/` | tratamiento epicondilitis | codo de tenista, epicondilalgia lateral | EPI, NMP-e, punción seca | 9, 3 |
| `/lesiones/epitrocleitis/` | tratamiento epitrocleitis | codo de golfista, epicondilalgia medial | EPI, NMP-e | 9 |
| `/lesiones/fascitis-plantar/` | tratamiento fascitis plantar | fasciopatía plantar, dolor en el talón al levantarse | EPI, MEP, punción seca | 10 |
| `/lesiones/desgarros-musculares/` | rehabilitación desgarro muscular | lesión muscular, rotura fibrilar, desgarro isquiotibial/gemelo | EPI, NMP-e, punción seca | 6 |
| `/lesiones/dolor-miofascial/` | dolor miofascial tratamiento | puntos gatillo, síndrome de dolor miofascial, contractura | punción seca, NMP-e | 11, 4 |
| `/lesiones/fibrosis-muscular/` | fibrosis muscular tratamiento | cicatriz muscular, fibrosis post desgarro | EPI, MEP, punción seca | 2 |
| `/lesiones/ligamentarias/` | rehabilitación lesiones ligamentarias | esguince de tobillo, ligamento colateral, lesión ligamentaria crónica | MEP, EPI | 6 |
| `/lesiones/bursopatias/` | tratamiento bursopatías | bursitis, bursitis trocantérea, dolor lateral de cadera | MEP, EPI, NMP-e | 6 |
| `/lesiones/dolor-cronico-musculoesqueletico/` | dolor musculoesquelético persistente | dolor crónico, sensibilización, dolor que no mejora | NMP-e, punción seca | 5, 12 |

### Blog (intención informacional, long tail)

| # | URL | KW primaria | Deriva a |
|---|---|---|---|
| 1 | `primera-sesion-fisioterapia-invasiva` | primera sesión fisioterapia invasiva | pilar, tratamientos, contacto |
| 2 | `como-actua-la-epi-en-el-tendon` | cómo funciona la EPI | EPI, Aquiles, rotuliana |
| 3 | `epi-para-tendinopatias` | EPI tendinopatía | EPI, todas las tendinopatías |
| 4 | `diferencias-entre-epi-y-puncion-seca` | diferencia EPI y punción seca | EPI, punción seca |
| 5 | `neuromodulacion-percutanea-nervio-y-dolor` | neuromodulación percutánea cómo funciona | NMP-e, dolor crónico |
| 6 | `ecografia-en-fisioterapia` | ecografía en fisioterapia / para qué sirve | pilar, 4 tratamientos |
| 7 | `tendinopatia-rotuliana-causas-y-rehabilitacion` | tendinopatía rotuliana rehabilitación | lesión rotuliana, EPI |
| 8 | `tendinopatia-de-aquiles-guia-de-rehabilitacion` | tendinopatía de Aquiles rehabilitación | lesión Aquiles, EPI |
| 9 | `epicondilitis-sintomas-y-causas` | epicondilitis síntomas y causas | lesión epicondilitis, epitrocleitis |
| 10 | `fascitis-plantar-abordaje-desde-fisioterapia` | fascitis plantar fisioterapia | lesión fascitis, EPI, MEP |
| 11 | `puncion-seca-con-ecografia-que-cambia` | punción seca con ecografía | punción seca, dolor miofascial |
| 12 | `cuando-se-recomienda-fisioterapia-invasiva` | cuándo se recomienda fisioterapia invasiva | pilar, lesiones, contacto |

### Páginas de soporte
- `/preguntas-frecuentes/` — KW: preguntas fisioterapia invasiva, ¿duele la fisioterapia invasiva?, ¿cuántas sesiones de EPI? · `FAQPage` · enlaza a cada tratamiento/lesión mencionado.
- `/sobre-mi/` — KW: [NOMBRE PROFESIONAL] kinesiólogo, kinesiólogo [CIUDAD] · `ProfilePage` + `Person` · base de E-E-A-T.
- `/contacto/` — KW: turno kinesiología [CIUDAD], solicitar evaluación fisioterapia invasiva · `ContactPage` + NAP + mapa.

---

## 4. Estrategia de enlazado interno

1. **Red bidireccional automática.** Cada página declara `related: { tratamientos, lesiones, blog }`. El build agrega automáticamente los enlaces inversos: si la lesión *Aquiles* declara *EPI*, la página EPI muestra *Aquiles* en "Lesiones en las que suele indicarse". Ninguna página queda huérfana (el build lo verifica).
2. **Enlaces contextuales en el cuerpo** con anchor text descriptivo y variado (no siempre la keyword exacta): "la electrólisis percutánea (EPI)", "tratamiento con EPI", "técnicas ecoguiadas".
3. **Breadcrumbs** en todas las páginas internas (visibles + `BreadcrumbList`).
4. **Cadena de conversión** en cada artículo: *artículo → lesión → tratamiento → pilar → evaluación*. Ejemplo: `tendinopatía rotuliana (blog) → /lesiones/tendinopatia-rotuliana/ → /tratamientos/epi-electrolisis-percutanea/ → /fisioterapia-invasiva-ecoguiada/ → WhatsApp`.
5. **Menú y footer** priorizan pilar, hubs y las páginas de mayor intención comercial.
6. **Validación en build:** todo enlace interno roto detiene el build con error.

---

## 5. Estructura visual de la home

| # | Sección | Objetivo | Contenido |
|---|---|---|---|
| 1 | **Hero** | Qué hace + especialidad + dónde + cómo pedir turno, en < 5 s | H1 "Fisioterapia Invasiva Ecoguiada en [CIUDAD]", bajada, CTA "Solicitar evaluación" (WhatsApp) + "Conocer tratamientos", visual de ecografía con trayectoria de aguja, línea de confianza (profesional + matrícula) |
| 2 | **Indicadores** | Diferencial inmediato | Ecografía en tiempo real · Mínimamente invasivo · Evaluación individual · Rehabilitación y ejercicio |
| 3 | **Qué es** | Texto base editorial + enlace a pilar | 2 párrafos + visual del proceso |
| 4 | **¿Por qué utilizar fisioterapia invasiva ecoguiada?** | Beneficios prudentes | 5 cards con iconografía lineal |
| 5 | **Tratamientos** | Distribuir autoridad a las 4 URLs | 4 cards (EPI, NMP-e, MEP, punción seca) |
| 6 | **¿Qué lesiones pueden abordarse?** | Distribuir autoridad a 12 URLs | Categorías con enlaces |
| 7 | **Cómo es el proceso** | Reducir incertidumbre → conversión | 4 pasos: evaluación → ecografía → intervención → readaptación |
| 8 | **Profesional** | E-E-A-T | Nombre, título, matrícula, formación, enlace a Sobre mí |
| 9 | **FAQ** | Objeciones + rich snippets | 6 preguntas clave |
| 10 | **Blog** | Autoridad temática | 3 artículos |
| 11 | **CTA final + NAP** | Conversión local | Dirección, horarios, WhatsApp, mapa |

---

## 6. SEO técnico implementado

- HTML estático pre-renderizado (sin framework en runtime). CSS crítico **inline** (sin request bloqueante). JS: 0 KB en casi todas las páginas; solo un script mínimo en `/contacto/` para armar el mensaje de WhatsApp.
- Menú mobile y FAQs con `<details>` nativo (accesible, sin JS).
- Fuente variable autoalojada (Manrope, subset latin, `woff2`, `font-display: swap`, precargada) + fallback métrico para evitar CLS.
- Imágenes: pipeline `npm run images` (sharp) → AVIF + WebP + JPG en varios anchos, `<picture>`, `width/height` explícitos, `loading="lazy"` salvo la imagen LCP (`fetchpriority="high"`).
- `sitemap.xml` y `robots.txt` generados en cada build, con `lastmod` real por página.
- Canonical absoluto, Open Graph, Twitter Cards, `lang="es-AR"`, `theme-color`, favicon SVG.
- Schema.org en `@graph`: `Physiotherapy` (subtipo de `MedicalBusiness`/`LocalBusiness`), `Person`, `WebSite`, `MedicalWebPage`, `MedicalProcedure`, `MedicalCondition`, `FAQPage`, `BreadcrumbList`, `BlogPosting`. Los campos pendientes se **omiten** del schema (nunca se publican placeholders ni reviews inventadas).
- Validación en build: enlaces internos rotos, títulos/descripciones duplicados, longitud de title/description, un único H1, páginas huérfanas, y listado de datos `[PENDIENTE]`.

## 7. Checklist post-lanzamiento (fuera del código)

1. Completar `site.config.js` y repetir **exactamente** el mismo NAP en Google Business Profile (categoría principal: *Fisioterapeuta* / *Kinesiólogo*).
2. Subir fotos reales (ecógrafo en uso, evaluación, consultorio, profesional) a `src/images/` y correr `npm run images`.
3. Alta en Google Search Console + envío de `sitemap.xml`.
4. Publicar 2 artículos por mes siguiendo la tabla de clusters; actualizar `updated` al revisar contenido.
5. Pedir reseñas reales en Google Business Profile (nunca incorporarlas como schema propio).

---

## 8. Ampliación: kinesiología en Mendoza y SEO para IA (octubre 2026)

El sitio deja de posicionar solo por "fisioterapia invasiva ecoguiada" y apunta también a **kinesiología en Mendoza** en general. Lo hecho para tratamientos y patologías se mantiene: cada URL conserva su keyword y suma enlaces hacia y desde la nueva sección.

### 8.1 Mapa de keywords (una URL por grupo, sin canibalización)

| Grupo | Keywords | Intención | URL |
|---|---|---|---|
| Marca + principal | kinesiología y fisioterapia invasiva Mendoza, MP Studio | navegacional / local | `/` |
| Kinesiología local | kinesiología Mendoza, kinesiólogo en Mendoza, kinesiología Luján de Cuyo, kinesiólogo Chacras de Coria, centro de kinesiología Mendoza, fisioterapia Mendoza | local / transaccional | `/kinesiologia-mendoza/` |
| Deportiva | kinesiología deportiva Mendoza, kinesiólogo deportivo, readaptación deportiva, lesiones deportivas | local / transaccional | `/kinesiologia-mendoza/deportiva/` |
| Traumatológica | kinesiología traumatológica, rehabilitación de fracturas, tendinitis, dolor de hombro o rodilla | local / transaccional | `/kinesiologia-mendoza/traumatologica/` |
| Postquirúrgica | rehabilitación postquirúrgica, kinesiología después de una operación, LCA, menisco, hombro | local / transaccional | `/kinesiologia-mendoza/postquirurgica/` |
| Lumbar | kinesiología dolor lumbar, lumbalgia, dolor de espalda baja, ciática | local / transaccional | `/kinesiologia-mendoza/dolor-lumbar/` |
| Cervical | kinesiología cervical, dolor de cuello, contractura cervical, cervicalgia | local / transaccional | `/kinesiologia-mendoza/dolor-cervical/` |
| Esguinces | rehabilitación esguince de tobillo, esguince de rodilla o muñeca | local / transaccional | `/kinesiologia-mendoza/esguinces/` |
| Fisioterapia invasiva | fisioterapia / kinesiología invasiva ecoguiada (sin cambios) | informacional-comercial | `/fisioterapia-invasiva-ecoguiada/` |
| Tratamientos y patologías | EPI, NMP-e, MEP, punción seca; 12 patologías (sin cambios) | comercial local | `/tratamientos/*`, `/lesiones/*` |
| Sesiones | cuántas sesiones de kinesiología, cada cuánto ir al kinesiólogo | informacional | `/blog/cuantas-sesiones-de-kinesiologia/` |
| A quién consultar | kinesiólogo o traumatólogo primero | comparativa | `/blog/kinesiologo-o-traumatologo/` |
| Cobertura | orden médica kinesiología, obra social kinesiología Mendoza | informacional | `/blog/obra-social-y-orden-medica-kinesiologia/` |
| Primera sesión | qué llevar al kinesiólogo, primera sesión de kinesiología | informacional | `/blog/que-llevar-a-la-primera-sesion-de-kinesiologia/` |
| Términos | kinesiología o fisioterapia, kinesiólogo o fisioterapeuta | comparativa | `/blog/kinesiologia-o-fisioterapia/` |
| Frío o calor | frío o calor en una lesión, hielo o calor contractura | informacional | `/blog/frio-o-calor-en-una-lesion/` |
| Vuelta al deporte | cuándo volver a entrenar después de una lesión | informacional | `/blog/volver-a-entrenar-despues-de-una-lesion/` |
| LCA | rehabilitación ligamento cruzado anterior, etapas y tiempos | informacional | `/blog/rehabilitacion-ligamento-cruzado-anterior/` |
| Rodilla del corredor | dolor de rodilla al correr | informacional | `/blog/dolor-de-rodilla-al-correr/` |

**Páginas por localidad:** no se crean todavía. Sin dirección no tendrían contenido propio (cómo llegar, referencias de la zona) y serían clones con otro nombre de ciudad. La pilar `/kinesiologia-mendoza/` tiene una sección de zonas atendidas. Con la dirección cargada, evaluar `/kinesiologia-mendoza/lujan-de-cuyo/` y `/kinesiologia-mendoza/chacras-de-coria/` con contenido real.

### 8.2 SEO para buscadores con IA (GEO / AEO)

- **Respuesta directa (`answer`)** de 40 a 60 palabras al inicio de cada pilar, servicio, tratamiento, patología y artículo. Se muestra como primer párrafo y va al schema como `abstract`.
- **H2 formulados como preguntas** reales y tablas citables (plazos orientativos, comparativas, etapas).
- **Entidad consistente:** la misma descripción (`ENTITY` en `src/lib/schema.js`) en el schema, `llms.txt`, home y footer. Repetir esa frase en Google Business Profile, Instagram y directorios.
- **Schema.org:** `Physiotherapy` (MedicalBusiness) con `knowsAbout`, `hasOfferCatalog` (kinesiología + fisioterapia invasiva), `availableService`, `areaServed` por localidad y provincia, `medicalSpecialty` e `isAcceptingNewPatients`. Cada servicio es `PhysicalTherapy` con `indication` hacia las patologías. `FAQPage` en todas las páginas con preguntas. `sameAs` se completa solo al cargar Instagram; sumar la URL de Google Business Profile cuando exista.
- **`/llms.txt` y `/llms-full.txt`:** se generan en cada build desde los mismos datos que las páginas (`src/lib/llms.js`).
- **robots.txt:** permite explícitamente GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Bingbot, Applebot-Extended y otros.
- **IndexNow:** clave en `public/<clave>.txt`. Después de cada deploy con dominio definitivo: `npm run build && npm run indexnow`. Bing alimenta a ChatGPT y Copilot.
- **Sitemap** con `lastmod` tomado de la fecha `updated` de cada página.

### 8.3 Validación

`node scripts/check-content.js src/content/*/*.js` valida campos, enlaces internos, `answer` (40 a 60 palabras), rayas, uso de "técnica" y lenguaje prohibido. El postbuild valida H1 único, títulos y descripciones duplicados, enlaces rotos y alt.

Lo que hay que hacer fuera del sitio está en [CHECKLIST-SEO-LOCAL.md](CHECKLIST-SEO-LOCAL.md).

### 8.4 Búsquedas de síntomas y recuperación (octubre 2026)

Para aparecer cuando alguien busca un síntoma o una lesión común, no solo un tratamiento:

| Grupo | Keywords | URL |
|---|---|---|
| Lesiones en general | tratamiento de lesiones Mendoza, recuperación de lesiones, rehabilitación de lesiones | `/lesiones/` |
| Tratamientos en general | tratamientos de kinesiología Mendoza | `/tratamientos/` |
| Contractura | contractura muscular, contractura en la espalda, nudos musculares | `/lesiones/contractura-muscular/` |
| Tortícolis | tortícolis, cuello duro al despertar | `/lesiones/torticolis/` |
| Tendinitis (hub) | tendinitis tratamiento, tendinitis vs tendinopatía | `/lesiones/tendinitis/` |
| Dolor por zona (hubs) | dolor de hombro, dolor de rodilla, dolor de cadera | `/lesiones/dolor-de-hombro/`, `/lesiones/dolor-de-rodilla/`, `/lesiones/dolor-de-cadera/` |
| Sobrecarga | pubalgia, periostitis tibial, dolor en la canilla al correr | `/lesiones/pubalgia/`, `/lesiones/periostitis-tibial/` |
| Articulares | lesión de menisco, hombro congelado | `/lesiones/lesion-de-menisco/`, `/lesiones/hombro-congelado/` |
| Nerviosas | túnel carpiano, hormigueo en la mano | `/lesiones/sindrome-del-tunel-carpiano/` |
| Recuperación (blog) | qué hacer después de una lesión, cuánto tarda una lesión muscular, contractura o desgarro, cómo recuperarse de una lesión | `/blog/...` |

Los hubs de síntoma resumen y derivan a las patologías específicas para no competir con ellas.

**Segunda tanda (octubre 2026):** columna (`ciatica`, `hernia-de-disco`, `escoliosis`), hubs de zona (`dolor-de-espalda`, `dolor-de-codo`, `dolor-de-muneca`, `dolor-de-tobillo`), articulares (`artrosis-de-rodilla`, `dolor-patelofemoral` para "condromalacia rotuliana") y `espolon-calcaneo` (deriva a fascitis plantar). La categoría "bursas" se integró en "Lesiones articulares y bursitis" y "fascia" en "Lesiones por sobrecarga".

### 8.5 Variante de color "gris perla"

Pedido del cliente para comparar. Se ve agregando `?tema=perla` a cualquier URL (queda guardado al navegar); `?tema=azul` vuelve al original. El diseño publicado por defecto sigue siendo el azul. Si se elige perla como definitivo, basta con fijar `data-tema="perla"` en `<html>` (Base.astro) y usar los pósters `hero-3d-perla*.webp`.
