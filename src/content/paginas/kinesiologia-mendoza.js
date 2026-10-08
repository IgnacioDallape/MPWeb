// Página pilar de kinesiología: la URL principal para "kinesiología en Mendoza".
export default {
  path: '/kinesiologia-mendoza/',
  title: 'Kinesiología en {{CIUDAD}} y {{LOCALIDAD}} | {{NOMBRE}}',
  description:
    'Kinesiología en {{CIUDAD}} con evaluación ecográfica: lesiones deportivas, postquirúrgicas, dolor lumbar y cervical y esguinces. Consultorio en {{LOCALIDAD}}.',
  h1: 'Kinesiología en {{CIUDAD}}',
  lead:
    'Kinesiología con evaluación clínica y ecografía musculoesquelética en {{LOCALIDAD}}. Un plan basado en ejercicio y progresión de cargas para que vuelvas a trabajar, entrenar o moverte sin dolor, con tratamientos ecoguiados cuando tu caso los necesita.',
  answer:
    'En {{NOMBRE}}, en {{LOCALIDAD}} ({{CIUDAD}}), hacemos kinesiología con evaluación clínica y ecografía musculoesquelética para lesiones deportivas y traumatológicas, rehabilitación postquirúrgica, dolor lumbar y cervical, esguinces y tendinopatías. El plan se basa en ejercicio terapéutico y progresión de cargas, y suma tratamientos ecoguiados como EPI o punción seca cuando la evaluación lo indica.',
  updated: '2026-10-07',
  seo: {
    primary: 'kinesiología Mendoza',
    secondary: ['kinesiólogo en Mendoza', 'kinesiología Luján de Cuyo', 'kinesiólogo Luján de Cuyo', 'kinesiología Chacras de Coria', 'kinesiólogo Chacras de Coria', 'fisioterapia Mendoza', 'kinesiología con ecografía', 'kinesiología Godoy Cruz'],
    intent: 'Comercial local: encontrar dónde hacer kinesiología en Mendoza, entender cómo es el tratamiento y decidir si consultar.',
    entities: ['Licenciatura en Kinesiología y Fisiatría', 'fisioterapia', 'ecografía musculoesquelética', 'ejercicio terapéutico', 'progresión de cargas', 'rehabilitación', 'fisioterapia invasiva ecoguiada', 'Luján de Cuyo', 'Chacras de Coria', 'Gran Mendoza'],
  },
  facts: [
    { label: 'Consultorio', value: '{{LOCALIDAD}}, {{CIUDAD}}' },
    { label: 'Evaluación', value: 'Clínica y con ecografía musculoesquelética' },
    { label: 'Base del plan', value: 'Ejercicio terapéutico y progresión de cargas' },
    { label: 'Cuando se indica', value: 'EPI · NMP-e · MEP · Punción seca ecoguiada' },
  ],
  waMessage: 'Hola, quería consultar por kinesiología.',

  body: `
## ¿Qué es la kinesiología y qué hace un kinesiólogo?

En Argentina, **kinesiología** es el nombre que recibe la disciplina que en otros países se llama **fisioterapia**. El título habilitante es la **Licenciatura en Kinesiología y Fisiatría**, y el profesional que lo tiene es el kinesiólogo. Si buscás un fisioterapeuta en Mendoza, lo que necesitás es un kinesiólogo: es la misma profesión con distinto nombre. Lo explicamos con más detalle en [kinesiología o fisioterapia: qué cambia](/blog/kinesiologia-o-fisioterapia/).

Un kinesiólogo evalúa cómo se mueve tu cuerpo, identifica qué estructura está generando el dolor o la limitación y arma un plan para recuperar la función. Ese plan puede incluir:

- **Ejercicio terapéutico** adaptado a tu lesión y a tu actividad.
- **Terapia manual** cuando ayuda a moverte mejor o a bajar el dolor.
- **Educación** sobre la lesión y sobre cómo manejar la carga en el día a día.
- **Agentes físicos** puntuales, siempre como complemento.
- **Readaptación** al trabajo, al deporte o a la vida diaria.

La kinesiología no se limita a "hacer aparatos". Un buen tratamiento se parece más a un entrenamiento guiado que a una sesión pasiva en la camilla. El objetivo es que el tejido lesionado vuelva a tolerar lo que le pedís: cargar cajas en una bodega, correr en el Parque San Martín, jugar al pádel o pasar ocho horas frente a la computadora sin dolor de cuello.

## ¿Qué tratamos en {{NOMBRE}}?

Trabajamos con lesiones y dolores del sistema musculoesquelético. Organizamos la atención en seis áreas:

- **[Kinesiología deportiva](/kinesiologia-mendoza/deportiva/):** lesiones de runners, ciclistas, jugadores de fútbol amateur, pádel y gimnasio, con vuelta progresiva al entrenamiento.
- **[Kinesiología traumatológica](/kinesiologia-mendoza/traumatologica/):** fracturas ya consolidadas, contusiones, tendinopatías y lesiones por sobrecarga del trabajo o la vida diaria.
- **[Kinesiología postquirúrgica](/kinesiologia-mendoza/postquirurgica/):** rehabilitación después de cirugías de rodilla, hombro, tobillo o columna, coordinada con las indicaciones del cirujano.
- **[Dolor lumbar](/kinesiologia-mendoza/dolor-lumbar/):** lumbalgia aguda y persistente, dolor que baja a la pierna, molestias al agacharte o al estar mucho tiempo sentado.
- **[Dolor cervical](/kinesiologia-mendoza/dolor-cervical/):** dolor de cuello, contracturas, rigidez y molestias que se irradian al hombro o al brazo.
- **[Esguinces](/kinesiologia-mendoza/esguinces/):** esguince de tobillo, rodilla o muñeca, con trabajo de estabilidad para reducir el riesgo de recaídas.

### Patologías más frecuentes

Dentro de esas áreas, hay lesiones que vemos muy seguido. Cada una tiene su propia ficha:

- [Tendinopatía de Aquiles](/lesiones/tendinopatia-aquiles/) y [tendinopatía rotuliana](/lesiones/tendinopatia-rotuliana/), habituales en corredores y deportes de salto.
- [Dolor de hombro por manguito rotador](/lesiones/manguito-rotador/), frecuente en trabajos con los brazos en alto y en natación o pádel.
- [Epicondilitis o codo de tenista](/lesiones/epicondilitis/), muy común en trabajos manuales y uso intensivo del mouse.
- [Fascitis plantar](/lesiones/fascitis-plantar/), el clásico dolor de talón al dar los primeros pasos de la mañana.
- [Desgarros musculares](/lesiones/desgarros-musculares/) de isquiotibiales, gemelos o cuádriceps.
- [Lesiones ligamentarias](/lesiones/ligamentarias/) que siguen molestando después de un esguince.

Podés ver el listado completo en [lesiones y patologías que tratamos](/lesiones/).

## ¿Cómo es la primera consulta de kinesiología?

La primera consulta está dedicada sobre todo a entender qué te pasa. Sin una buena evaluación, cualquier tratamiento es una apuesta. El orden suele ser este:

1. **Entrevista.** Cómo y cuándo empezó el dolor, qué lo empeora y qué lo alivia, a qué te dedicás, qué deporte hacés, qué tratamientos probaste y qué antecedentes de salud tenés.
2. **Revisión de estudios.** Si tenés ecografías, resonancias, radiografías o informes médicos, se revisan junto con tus síntomas.
3. **Exploración física.** Pruebas de movilidad, fuerza, estabilidad y gestos que reproducen el dolor. Se compara con el lado sano.
4. **Ecografía musculoesquelética.** Cuando aporta información, se mira el tendón, el músculo o el ligamento implicado en el mismo momento.
5. **Explicación del diagnóstico kinésico.** Qué estructura está comprometida, por qué creemos que se lesionó y qué se puede esperar.
6. **Plan inicial.** Primeros ejercicios, ajustes de carga para el trabajo o el entrenamiento y, si corresponde, primeras intervenciones.

Llevá ropa cómoda que permita descubrir la zona y tus estudios previos. Tenés una lista completa en [qué llevar a la primera sesión de kinesiología](/blog/que-llevar-a-la-primera-sesion-de-kinesiologia/). Si querés conocer cómo trabajamos en detalle, mirá nuestra [metodología de trabajo](/sobre-mi/).

### ¿Cómo siguen las sesiones después de la primera?

Las sesiones de seguimiento arrancan con una breve reevaluación: cómo respondió la zona a los ejercicios de la semana, si apareció dolor al día siguiente y qué pudiste hacer en el trabajo o en el entrenamiento. Con esa información se decide si la carga se mantiene, se progresa o se ajusta.

La mayor parte de la sesión es activa. Se trabaja fuerza, movilidad y control del movimiento, y se va acercando el ejercicio a lo que necesitás hacer en tu vida real: subir escaleras con peso, agacharte a podar en un viñedo, pedalear una subida en la montaña o saltar en la cancha de pádel. La terapia manual y otros recursos se usan cuando ayudan a que el ejercicio sea posible, no como sustituto.

Cada tanto se repiten las pruebas de la primera consulta, y la ecografía cuando corresponde, para comparar con el punto de partida. Así sabés en qué etapa estás y qué falta para el alta.

## ¿Por qué evaluar con ecografía?

La mayoría de las consultas de kinesiología se basan en la entrevista y la exploración física, y eso sigue siendo central. Sumar un **ecógrafo** al consultorio permite ver el tejido en tiempo real, sin esperar un turno de diagnóstico por imágenes.

Con la ecografía musculoesquelética se puede observar:

- El **grosor y la organización** de un tendón, y si hay zonas alteradas.
- La extensión de un **desgarro** y cómo va cicatrizando con las semanas.
- El estado de un **ligamento** después de un esguince.
- La presencia de **líquido** en una bursa o alrededor de una articulación.
- Cómo se comportan las estructuras **en movimiento**, algo que una imagen estática no muestra.

Esto no reemplaza los estudios que pida tu médico. Lo que hace es ayudar a tomar mejores decisiones dentro de la sesión: cuánta carga tolerar, cuándo progresar y si conviene sumar un tratamiento más específico. También sirve para comparar la evolución a lo largo del tratamiento. Profundizá en [para qué sirve la ecografía en fisioterapia](/blog/ecografia-en-fisioterapia/).

{{CTA}}

## Kinesiología convencional y fisioterapia invasiva ecoguiada: cuándo se suma cada una

La base de cualquier plan es la kinesiología convencional: ejercicio, terapia manual y educación. La **fisioterapia invasiva ecoguiada** no la reemplaza: se suma en casos concretos, cuando la evaluación muestra que puede ayudar a destrabar una lesión que no avanza.

| | Kinesiología convencional | Fisioterapia invasiva ecoguiada |
|---|---|---|
| Qué incluye | Ejercicio terapéutico, terapia manual, educación, readaptación | EPI, neuromodulación percutánea, MEP o punción seca, con aguja y guía ecográfica |
| Cuándo se usa | En prácticamente todas las lesiones, desde el inicio | En lesiones persistentes o con alteración localizada visible en la ecografía |
| Sobre qué actúa | La función global: fuerza, movilidad, control, tolerancia a la carga | Una estructura puntual: un tendón, un punto gatillo, una cicatriz o un nervio periférico |
| Frecuencia | Suele ser la parte principal de cada sesión | Algunas sesiones del plan, espaciadas |
| Rol en el plan | Base del tratamiento | Complemento que se integra con el ejercicio |

Algunas situaciones en las que suele considerarse un tratamiento ecoguiado:

- Una tendinopatía que lleva meses y no mejora con ejercicio bien dosificado.
- Un desgarro antiguo que dejó una zona de fibrosis.
- Dolor miofascial con puntos gatillo que limitan el avance del plan.
- Dolor con un componente nervioso periférico marcado.

Conocé cada opción en la página de [fisioterapia invasiva ecoguiada](/fisioterapia-invasiva-ecoguiada/) y en el listado de [tratamientos ecoguiados](/tratamientos/). Si la evaluación indica que no hace falta, el plan sigue solo con kinesiología convencional.

## ¿Cuántas sesiones de kinesiología se necesitan y cada cuánto?

Depende de la lesión, de cuánto tiempo lleva, de tu actividad y de cómo responde tu cuerpo. Estos rangos son orientativos y se ajustan después de la evaluación:

| Situación | Frecuencia orientativa | Duración orientativa del proceso |
|---|---|---|
| Dolor lumbar o cervical agudo | 1 a 2 sesiones por semana | Entre 2 y 6 semanas |
| Esguince de tobillo leve o moderado | 1 a 2 sesiones por semana | Entre 3 y 8 semanas |
| Desgarro muscular | 2 sesiones por semana al inicio | Entre 3 y 10 semanas, según el grado |
| Tendinopatía persistente | 1 sesión por semana o cada 10 días, con ejercicio en casa | Entre 2 y 4 meses o más |
| Rehabilitación postquirúrgica | 2 a 3 sesiones por semana al inicio | Varios meses, según la cirugía |

Cada sesión suele durar entre **45 y 60 minutos**. Una parte importante del avance ocurre entre sesiones, con los ejercicios que hacés en tu casa o en el gimnasio. Por eso, más sesiones no siempre significa mejores resultados: lo que cuenta es la constancia del plan. Ampliamos el tema en [cuántas sesiones de kinesiología hacen falta](/blog/cuantas-sesiones-de-kinesiologia/).

## ¿Necesito orden médica u obra social?

Muchas obras sociales y prepagas piden una **orden médica** con diagnóstico para cubrir sesiones de kinesiología. Si vas de manera particular, en general no es imprescindible para la evaluación, aunque si tenés una orden o estudios previos conviene que los traigas.

Si tu cobertura la pide, revisá que la orden indique el diagnóstico o la zona a tratar y, si es posible, la cantidad de sesiones. Algunas obras sociales también solicitan una autorización previa antes de la primera sesión, y los plazos para conseguirla varían.

Las condiciones cambian según cada obra social y cada plan, así que lo más práctico es consultarnos por WhatsApp con el nombre de tu cobertura y te contamos cómo seguir. Te dejamos una guía general en [obra social y orden médica para kinesiología](/blog/obra-social-y-orden-medica-kinesiologia/).

## Zonas que atendemos: kinesiología en Luján de Cuyo y el Gran Mendoza

El consultorio de {{NOMBRE}} está en **{{LOCALIDAD}}**. Recibimos pacientes de distintos puntos de Mendoza:

- **Luján de Cuyo:** Chacras de Coria, Vistalba, Carrodilla, Mayor Drummond y Luján centro.
- **Godoy Cruz.**
- **Ciudad de Mendoza.**
- **Maipú.**
- **Guaymallén.**
- **Las Heras.**

Muchos de nuestros pacientes vienen de Chacras de Coria y de los distritos vecinos de Luján, pero también recibimos a quienes trabajan en el centro o en Godoy Cruz y prefieren un consultorio con ecografía para hacer el seguimiento de su lesión. Como buena parte del plan se basa en ejercicios que hacés en tu casa o en el gimnasio, la frecuencia de visitas se organiza para que sea compatible con tu rutina.

Si vivís en Chacras de Coria o en otra zona cercana y buscás un kinesiólogo con evaluación ecográfica, escribinos por WhatsApp y coordinamos el turno. Para la ubicación exacta y los datos de contacto, entrá en [contacto](/contacto/).

## ¿Cuándo consultar primero con un médico?

La kinesiología es de acceso directo en muchos casos, pero algunas situaciones necesitan una evaluación médica antes de empezar:

- Dolor después de un **golpe fuerte o una caída** con deformidad, mucha hinchazón o imposibilidad de apoyar.
- **Pérdida de fuerza** progresiva, adormecimiento que se extiende o alteraciones al orinar o evacuar junto con dolor lumbar.
- Dolor acompañado de **fiebre**, pérdida de peso sin explicación o malestar general.
- Dolor que **no cambia con el movimiento** ni con el reposo, o que empeora mucho de noche.
- Dolor en el pecho, falta de aire o dolor en la pantorrilla con hinchazón y calor.

Si tenés dudas sobre a quién consultar primero, leé [kinesiólogo o traumatólogo: a quién ir](/blog/kinesiologo-o-traumatologo/). Cuando en la evaluación aparece alguna de estas señales, te derivamos al médico antes de avanzar.
`,

  faqs: [
    {
      q: '¿Dónde hacer kinesiología en Mendoza?',
      a: 'En {{NOMBRE}} atendemos en un consultorio en {{LOCALIDAD}}, con evaluación clínica y ecografía musculoesquelética. Recibimos pacientes de Chacras de Coria, Godoy Cruz, Ciudad de Mendoza, Maipú, Guaymallén y Las Heras. Para coordinar un turno, escribinos por WhatsApp.',
    },
    {
      q: '¿Qué diferencia hay entre kinesiología y fisioterapia?',
      a: 'Ninguna en cuanto a la profesión: en Argentina se llama kinesiología y el título es Licenciatura en Kinesiología y Fisiatría, mientras que en España y otros países se dice fisioterapia. Ambas abordan la rehabilitación de lesiones y del dolor musculoesquelético con ejercicio, terapia manual y educación.',
    },
    {
      q: '¿Hace falta orden médica para ir al kinesiólogo?',
      a: 'Depende de cómo vayas a pagar las sesiones. Muchas obras sociales y prepagas la piden para cubrir el tratamiento, mientras que de manera particular en general no es imprescindible para la evaluación. Consultanos por WhatsApp con tu cobertura y te orientamos.',
    },
    {
      q: '¿Atienden deportistas amateurs?',
      a: 'Sí. Gran parte de las consultas son de personas que corren, andan en bici, juegan al fútbol o al pádel o entrenan en el gimnasio. El plan apunta a que vuelvas a tu deporte de forma progresiva. Más información en [kinesiología deportiva](/kinesiologia-mendoza/deportiva/).',
    },
    {
      q: '¿Cuánto dura una sesión de kinesiología?',
      a: 'Una sesión suele durar entre 45 y 60 minutos. La primera puede extenderse un poco más porque incluye la entrevista, la exploración física y, cuando hace falta, la ecografía.',
    },
    {
      q: '¿Hacen kinesiología a domicilio?',
      a: 'La evaluación con ecografía y los tratamientos ecoguiados se hacen en el consultorio de {{LOCALIDAD}}, porque requieren el equipo y condiciones de higiene específicas. Si tenés una situación particular que te impide trasladarte, consultanos por WhatsApp y vemos las opciones.',
    },
    {
      q: '¿Siempre se usan agujas en el tratamiento?',
      a: 'No. La base del tratamiento es la kinesiología convencional, con ejercicio terapéutico, terapia manual y educación. Los tratamientos ecoguiados con aguja se suman solo cuando la evaluación muestra que pueden ayudar, y siempre con tu acuerdo.',
    },
  ],
};
