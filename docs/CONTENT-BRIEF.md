# Brief editorial para redactar contenido

Leé primero `docs/ESTRATEGIA-SEO.md` (keywords por URL, enlazado) y el ejemplo completo `src/content/tratamientos/epi-electrolisis-percutanea.js`. Todo archivo nuevo debe seguir **exactamente** la misma forma (módulo ES con `export default { ... }`).

## Tono y reglas clínicas (obligatorias)

- Español rioplatense con **voseo** moderado y cercano sin ser informal ("podés", "consultá", "tu lesión"). Nada de "usted".
- Profesional, preciso, científico pero comprensible. Frases cortas. Explicar términos técnicos la primera vez.
- **Prohibido:** "cura", "curar", "garantiza", "elimina definitivamente", "recuperación asegurada", "el mejor tratamiento", "revolucionario", "resultados increíbles", "100%", cifras inventadas de éxito, estudios inventados, porcentajes, nombres de autores o marcas registradas.
- Usar: "puede", "suele", "en muchos casos", "se indica tras una evaluación", "forma parte de un plan", "la evidencia sugiere" (solo si es cierto en términos generales).
- Siempre: evaluación previa antes de indicar una técnica; las técnicas invasivas se **integran** con ejercicio terapéutico, readaptación y progresión de cargas; mencionar que no todos los casos son candidatos.
- No dar diagnósticos ni pautas que reemplacen una consulta. Incluir señales de alarma / cuándo consultar con un médico cuando aplique.
- Sin keyword stuffing: la KW primaria aparece en title, H1, lead y 1–2 veces natural en el cuerpo; variar con sinónimos y entidades relacionadas.
- `{{CIUDAD}}` solo donde tenga sentido semántico (title, description y, como mucho, 1 mención en el cuerpo de páginas comerciales). En el blog, en general **no** usar ciudad salvo en el cierre.
- Tokens disponibles: `{{CIUDAD}}`, `{{NOMBRE}}`, `{{PROVINCIA}}`. Insertar `{{CTA}}` **una sola vez** en el cuerpo, en una línea propia, aproximadamente a mitad del texto.

## Markdown soportado en `body`

`## H2` (generan la tabla de contenidos — usar 5 a 9 por página), `### H3`, párrafos, listas `- ` y `1. `, `**negrita**`, `*cursiva*`, `[texto](/ruta/)`, tablas `| a | b |` (con fila separadora `|---|---|`), llamados `> texto`. No usar `#` (H1 lo pone la plantilla). No usar comillas invertidas (backticks) dentro del body porque es un template literal; si necesitás comillas usá "dobles".

## Enlaces internos

Solo se puede enlazar a estas URLs (el build falla si hay un enlace roto). Siempre con barra final.

```
/  /fisioterapia-invasiva-ecoguiada/  /tratamientos/  /lesiones/  /preguntas-frecuentes/  /sobre-mi/  /contacto/  /blog/
/tratamientos/epi-electrolisis-percutanea/
/tratamientos/neuromodulacion-percutanea-ecoguiada/
/tratamientos/microelectrolisis-percutanea-mep/
/tratamientos/puncion-seca-ecoguiada/
/lesiones/tendinopatia-aquiles/   /lesiones/tendinopatia-rotuliana/   /lesiones/manguito-rotador/
/lesiones/epicondilitis/   /lesiones/epitrocleitis/   /lesiones/fascitis-plantar/
/lesiones/desgarros-musculares/   /lesiones/dolor-miofascial/   /lesiones/fibrosis-muscular/
/lesiones/ligamentarias/   /lesiones/bursopatias/   /lesiones/dolor-cronico-musculoesqueletico/
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
```

Cada página debe tener 4–10 enlaces contextuales en el cuerpo con anchor text descriptivo y variado. En `related` se usan **solo slugs** (sin ruta).

## Forma: TRATAMIENTO (`src/content/tratamientos/<slug>.js`)

Igual al ejemplo EPI. Campos: `slug, order, name, shortName, icon, cardText, title, description, h1, lead, updated: '2026-10-02', seo{primary, secondary[], intent, entities[]}, facts[{label,value}] (4), body, faqs[{q,a}] (5–7), related{tratamientos[], lesiones[], blog[]}, procedure{name, alternateName[], description, howPerformed, preparation, followup, bodyLocation}, waMessage`.

Secciones H2 obligatorias del body: qué es · cómo funciona · indicaciones (lesiones enlazadas) · ventajas de la guía ecográfica · qué esperar durante una sesión (antes/durante/después) · recuperación posterior · contraindicaciones y precauciones · relación con otras técnicas. 1000–1500 palabras.

`icon` disponibles: probe, needle, target, evaluation, activity, layers, wave, bolt, nerve, muscle, tendon, foot, joint, pulse, clock, shield, progress.

`title`: ≤ 65 caracteres aprox. contando `{{CIUDAD}}` y `{{NOMBRE}}` como ~10 c/u. `description`: 140–160 caracteres.

## Forma: LESIÓN (`src/content/lesiones/<slug>.js`)

```js
export default {
  slug: 'tendinopatia-aquiles',
  order: 1,                       // orden dentro de su categoría
  category: 'tendinosas',         // tendinosas | fascia | musculares | ligamentarias | bursas | dolor
  name: 'Tendinopatía de Aquiles', // nombre corto para cards/enlaces
  icon: 'tendon',
  cardText: '...',                // ~120–150 caracteres, foco en el paciente
  title: 'Tratamiento de la tendinopatía de Aquiles en {{CIUDAD}} | {{NOMBRE}}',
  description: '...',             // 140–160 car.
  h1: '...',                      // centrado en "tratamiento de X" con sinónimo popular
  lead: '...',                    // 1–2 frases empáticas y claras
  updated: '2026-10-02',
  seo: { primary, secondary: [], intent, entities: [] },
  facts: [                        // 4 datos rápidos
    { label: 'Zona', value: '...' },
    { label: 'Síntoma típico', value: '...' },
    { label: 'Frecuente en', value: '...' },
    { label: 'Técnicas asociadas', value: '...' },
  ],
  body: `...`,
  faqs: [{ q, a }],               // 4–6 preguntas REALES de ese paciente
  related: { tratamientos: [...], lesiones: [...], blog: [...] },
  condition: {                    // para schema MedicalCondition
    name: '...', alternateName: ['...'], description: '...',
    anatomy: 'Tendón de Aquiles', symptoms: ['...', '...'],
  },
  waMessage: 'Hola, quería consultar por una tendinopatía de Aquiles.',
};
```

Secciones H2 sugeridas (adaptarlas a la intención **específica** de esa lesión — no clonar estructura ni frases entre lesiones): qué es (con nombre popular) · síntomas habituales · por qué aparece / factores de riesgo propios de esa lesión · cómo se evalúa (exploración + ecografía: qué se ve) · cómo es el tratamiento (enfoque integral: educación, gestión de carga, ejercicio específico de esa región, y técnicas ecoguiadas cuando están indicadas, enlazadas) · tiempos y evolución (prudente, sin plazos garantizados) · cuándo consultar / señales de alarma. 1000–1400 palabras. Debe responder mejor que una página genérica: detalles concretos de esa región, deportes, gestos, ejercicios tipo (sin prescribir dosis), diagnósticos diferenciales que se descartan.

## Forma: ARTÍCULO (`src/content/blog/<slug>.js`)

```js
export default {
  slug: 'ecografia-en-fisioterapia',
  title: '¿Para qué sirve la ecografía en fisioterapia? | {{NOMBRE}}', // ≤ 65 car.
  description: '...',          // 140–160 car.
  h1: '...',
  lead: '...',                 // 2–3 frases: responde la pregunta principal de entrada (snippet)
  date: '2026-10-02',
  updated: '2026-10-02',
  category: 'Técnicas',        // Técnicas | Lesiones | Guías para pacientes
  seo: { primary, secondary: [], intent, entities: [] },
  body: `...`,                 // 1000–1500 palabras, 5–8 H2
  faqs: [{ q, a }],            // 3–4
  related: { tratamientos: [...], lesiones: [...], blog: [...] },
};
```

Artículos: intención **informacional**. Responder la pregunta en las primeras líneas (el `lead`), luego profundizar. Cerrar con una sección que derive a la página de lesión/tratamiento correspondiente y a la evaluación (cadena: artículo → lesión → tratamiento → pilar → contacto). No reutilizar párrafos de otras páginas.

## Validación

Después de escribir, corré `node scripts/check-content.js <ruta-del-archivo>` si existe; si no, al menos `node -e "import('./src/content/<sección>/<slug>.js').then(m=>console.log(Object.keys(m.default)))"` desde la raíz del proyecto para verificar que el módulo parsea.
