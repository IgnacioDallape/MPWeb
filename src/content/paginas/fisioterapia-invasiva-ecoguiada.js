// Página pilar: la URL más importante del sitio después de la home.
export default {
  path: '/fisioterapia-invasiva-ecoguiada/',
  title: 'Fisioterapia Invasiva Ecoguiada: tratamientos y lesiones | {{NOMBRE}}',
  description:
    'Tratamientos de fisioterapia invasiva guiados por ecografía: EPI, neuromodulación percutánea, MEP y punción seca. Evaluación personalizada en {{CIUDAD}}.',
  h1: 'Fisioterapia invasiva ecoguiada',
  lead:
    'Tratamientos que utilizan agujas ultrafinas para actuar directamente sobre la estructura afectada (tendón, músculo, ligamento o nervio periférico) con guía ecográfica en tiempo real, como parte de un plan de rehabilitación individual.',
  answer:
    'La fisioterapia invasiva ecoguiada reúne tratamientos con agujas ultrafinas, como la EPI, la neuromodulación percutánea, la MEP y la punción seca, que actúan sobre el tendón, músculo, ligamento o nervio afectado con guía ecográfica en tiempo real. En {{NOMBRE}}, en {{LOCALIDAD}} ({{CIUDAD}}), siempre se indica tras una evaluación y se combina con ejercicio terapéutico.',
  updated: '2026-10-02',
  seo: {
    primary: 'fisioterapia invasiva ecoguiada',
    secondary: ['kinesiología invasiva ecoguiada', 'fisioterapia ecoguiada', 'kinesiología ecoguiada', 'tratamiento ecoguiado', 'fisioterapia con ecógrafo', 'fisioterapia invasiva en [CIUDAD]'],
    intent: 'Informacional-comercial: entender qué es, para qué sirve, si duele y si es adecuada para su lesión antes de consultar.',
    entities: ['ecografía musculoesquelética', 'aguja filiforme', 'corriente galvánica', 'sistema nervioso periférico', 'tendinopatía', 'ejercicio terapéutico', 'carga progresiva'],
  },
  facts: [
    { label: 'Guía', value: 'Ecografía en tiempo real' },
    { label: 'Tratamientos', value: 'EPI · NMP-e · MEP · Punción seca' },
    { label: 'Abordaje', value: 'Mínimamente invasivo' },
    { label: 'Siempre con', value: 'Evaluación previa y ejercicio terapéutico' },
  ],
  waMessage: 'Hola, quería consultar si la fisioterapia invasiva ecoguiada puede ser adecuada para mi lesión.',

  body: `
## ¿Qué es la fisioterapia invasiva ecoguiada?

La **fisioterapia invasiva ecoguiada**, también llamada kinesiología invasiva ecoguiada, engloba un conjunto de tratamientos que utilizan **agujas ultrafinas** para actuar directamente sobre la estructura afectada, siempre con la guía de un **ecógrafo**.

A diferencia de los tratamientos que trabajan "desde afuera" (terapia manual, aparatología de superficie), estas intervenciones llegan al tejido que origina el problema: una zona alterada de un tendón, un punto gatillo en un músculo profundo, una cicatriz fibrosa o un nervio periférico relacionado con el dolor.

Permiten tratar de forma precisa lesiones **tendinosas, musculares y ligamentarias**, así como estructuras vinculadas al **sistema nervioso periférico**.

> Ninguno de estos tratamientos reemplaza a la rehabilitación. Son herramientas que, bien indicadas, se integran en un plan que incluye readaptación, ejercicio terapéutico y progresión de cargas.

## Cómo funciona: evaluación, ecografía e intervención

El proceso sigue siempre el mismo orden:

1. **Anamnesis completa.** Cómo empezó el dolor, qué lo empeora, qué actividad o deporte realizás, qué tratamientos hiciste y qué antecedentes de salud tenés.
2. **Exploración física.** Pruebas de movilidad, fuerza, carga y palpación para identificar qué estructura está implicada.
3. **Evaluación ecográfica.** El ecógrafo permite ver el tejido: su grosor, su organización, si hay zonas alteradas, cicatrices o líquido, y cómo se comporta en movimiento.
4. **Decisión terapéutica.** Con toda esa información se determina si un tratamiento invasivo es adecuado, cuál, y en qué momento del plan. A veces la conclusión es que no hace falta.
5. **Intervención guiada.** Si está indicada, la aguja se dirige bajo visión ecográfica hasta el punto exacto.
6. **Readaptación.** El ejercicio terapéutico y la progresión de cargas consolidan los cambios y devuelven al tejido su capacidad funcional.

## Tratamientos de fisioterapia invasiva

Cada tratamiento tiene un objetivo distinto. La elección depende del tejido afectado, de la fase de la lesión y de cada persona.

### Electrólisis percutánea intratisular (EPI)

Aplica una corriente galvánica a través de la aguja sobre el tejido lesionado, habitualmente el tendón, para estimular una respuesta de reparación. Es uno de los tratamientos más utilizados en tendinopatías persistentes. [Conocé cómo es el tratamiento con EPI](/tratamientos/epi-electrolisis-percutanea/).

### Neuromodulación percutánea ecoguiada (NMP-e)

Se dirige a un **nervio periférico** para estimularlo eléctricamente y modular respuestas relacionadas con el dolor y la activación muscular. No busca actuar sobre el tejido lesionado, sino sobre el sistema que lo controla. [Más sobre la neuromodulación percutánea](/tratamientos/neuromodulacion-percutanea-ecoguiada/).

### Microelectrólisis percutánea (MEP)

Utiliza corriente galvánica de muy baja intensidad, en **microamperios**. Suele tolerarse mejor y resulta útil en tejidos más sensibles o superficiales. [Ver la página de MEP](/tratamientos/microelectrolisis-percutanea-mep/).

### Punción seca ecoguiada

Aborda **puntos gatillo** y estructuras musculares con una aguja, sin corriente ni sustancias. La ecografía aporta precisión en músculos profundos y seguridad cerca de estructuras sensibles. [Punción seca con guía ecográfica](/tratamientos/puncion-seca-ecoguiada/).

Si querés comparar dos de las más consultadas, leé [diferencias entre EPI y punción seca](/blog/diferencias-entre-epi-y-puncion-seca/).

{{CTA}}

## ¿Por qué utilizar ecografía?

Hacer estos tratamientos "a ciegas", guiándose solo por la palpación, limita la precisión y aumenta el riesgo en determinadas zonas. La ecografía cambia eso:

- **Mayor precisión:** se visualizan las estructuras en tiempo real y se guía la intervención hacia la zona de interés.
- **Intervención específica:** permite actuar sobre una estructura muscular, tendinosa o nerviosa concreta, y no sobre el tejido de alrededor.
- **Más seguridad:** se identifican vasos, nervios, pleura y otras estructuras que deben evitarse.
- **Seguimiento objetivo:** la imagen, junto con la evolución del dolor y la función, ayuda a valorar el progreso.

Profundizá en [para qué sirve la ecografía en fisioterapia](/blog/ecografia-en-fisioterapia/).

## ¿Qué lesiones pueden abordarse?

La fisioterapia invasiva ecoguiada puede formar parte del tratamiento de:

- **Lesiones tendinosas:** [tendón de Aquiles](/lesiones/tendinopatia-aquiles/), [tendón rotuliano](/lesiones/tendinopatia-rotuliana/), [manguito rotador](/lesiones/manguito-rotador/), [epicondilitis](/lesiones/epicondilitis/), [epitrocleitis](/lesiones/epitrocleitis/) y otras tendinopatías.
- **[Fascitis plantar](/lesiones/fascitis-plantar/)** de evolución prolongada.
- **Lesiones musculares:** [desgarros](/lesiones/desgarros-musculares/), [dolor miofascial](/lesiones/dolor-miofascial/) y [fibrosis](/lesiones/fibrosis-muscular/).
- **[Lesiones ligamentarias](/lesiones/ligamentarias/)** con dolor o engrosamiento persistente.
- **[Bursopatías](/lesiones/bursopatias/)** de hombro, cadera, rodilla o talón.
- **[Dolor musculoesquelético persistente](/lesiones/dolor-cronico-musculoesqueletico/)**, como parte de un abordaje integral.

Podés ver todas en la sección de [lesiones](/lesiones/).

## ¿Cuándo se recomienda?

Suele considerarse cuando una lesión **no evoluciona como se espera** con el tratamiento convencional, cuando la ecografía muestra una **alteración localizada** del tejido o cuando el dolor limita la posibilidad de avanzar con el ejercicio. No es, en general, la primera opción para todas las lesiones, ni todas las personas son candidatas. Lo explicamos en detalle en [cuándo se recomienda la fisioterapia invasiva](/blog/cuando-se-recomienda-fisioterapia-invasiva/).

## Qué esperar de una sesión

Los tratamientos se realizan con **material estéril de un solo uso**, tras desinfectar la piel. Según el tratamiento, la sensación puede ser un pinchazo leve, una contracción muscular breve o una molestia intensa pero corta durante la aplicación de corriente. Después puede quedar una molestia local durante algunas horas o un par de días. En la mayoría de los casos se puede seguir con la actividad diaria, con pautas específicas.

Si es tu primera vez, te puede servir la guía [primera sesión de fisioterapia invasiva: qué esperar](/blog/primera-sesion-fisioterapia-invasiva/).

## Seguridad y contraindicaciones

Antes de cualquier intervención se revisan las situaciones en las que no se aplica o se aplica con precaución: embarazo, marcapasos u otros dispositivos implantados (en tratamientos con corriente), trastornos de la coagulación o medicación anticoagulante, infecciones o lesiones de piel en la zona, tumores, fobia intensa a las agujas y algunas enfermedades sistémicas. La evaluación previa no es un trámite: es parte del tratamiento.

## Un abordaje integral, no un tratamiento aislado

El objetivo no es "pinchar" una lesión, sino que vuelvas a hacer lo que necesitás (trabajar, entrenar, competir, caminar sin dolor) con un tejido que tolere la carga. Por eso cada intervención se acompaña de:

- **Educación** sobre la lesión y sobre cómo gestionar la carga diaria.
- **Ejercicio terapéutico** específico y progresivo.
- **Readaptación** a la actividad o al gesto deportivo.
- **Reevaluaciones** periódicas para ajustar el plan.

La fisioterapia invasiva no es una disciplina aparte: es una parte más de la [kinesiología en {{CIUDAD}}](/kinesiologia-mendoza/) que hacemos en {{NOMBRE}}, donde la evaluación clínica y el ejercicio son la base y las agujas se suman solo cuando aportan.
`,

  faqs: [
    {
      q: '¿Qué es la fisioterapia invasiva?',
      a: 'Es un conjunto de tratamientos de fisioterapia que utilizan agujas ultrafinas para actuar directamente sobre el tejido afectado (tendón, músculo, ligamento o nervio periférico). Cuando se realiza con ecografía se llama fisioterapia invasiva ecoguiada.',
    },
    {
      q: '¿La fisioterapia invasiva duele?',
      a: 'Depende del tratamiento y de cada persona. Puede sentirse un pinchazo, una contracción muscular breve o una molestia intensa pero corta durante la aplicación de corriente. La intensidad se adapta a la tolerancia y la sesión puede detenerse en cualquier momento.',
    },
    {
      q: '¿Por qué se utiliza ecografía?',
      a: 'Porque permite ver en tiempo real la estructura a tratar y la aguja, lo que aporta precisión para llegar a la zona de interés y seguridad para evitar vasos, nervios y otras estructuras sensibles.',
    },
    {
      q: '¿Es necesaria una evaluación previa?',
      a: 'Sí, siempre. La anamnesis, la exploración física y la ecografía determinan si un tratamiento invasivo está indicado, cuál y en qué momento. En algunos casos la mejor opción es otro abordaje.',
    },
    {
      q: '¿Cuántas sesiones se necesitan?',
      a: 'Varía según la lesión, su antigüedad y la respuesta de cada persona. Las sesiones suelen espaciarse para dar tiempo a la adaptación del tejido y se reevalúa la evolución antes de cada una.',
    },
    {
      q: '¿Puedo entrenar después del tratamiento?',
      a: 'En general no se indica reposo absoluto. Se ajusta temporalmente la carga de la actividad que más exige al tejido tratado y se siguen las pautas de ejercicio del plan. Cada caso recibe indicaciones específicas.',
    },
  ],
};
