import { config, known } from '../lib/site.js';

const name = known(config.business.name) || config.professional.name;
const b = config.business;
const p = config.professional;

export const LEGAL = [
  {
    slug: 'aviso-legal',
    h1: 'Aviso legal',
    title: 'Aviso legal | {{NOMBRE}}',
    description: 'Condiciones de uso del sitio web y alcance de la información publicada.',
    body: `
## Titular del sitio

Este sitio web es titularidad de **${name}** (${p.name}, ${p.title}, matrícula ${p.license}), con domicilio profesional en ${b.address}, ${b.city}, ${b.province}. CUIT: [PENDIENTE].

## Alcance de la información

El contenido publicado tiene fines **exclusivamente informativos y educativos**. No constituye un diagnóstico ni reemplaza la consulta con un profesional de la salud. Las técnicas descriptas se indican únicamente tras una evaluación individual.

## Propiedad intelectual

Los textos, ilustraciones y elementos gráficos de este sitio pertenecen a su titular, salvo indicación en contrario. Los sellos de certificación pertenecen a sus respectivos emisores. Se permite citar fragmentos breves con mención de la fuente y enlace a la página original.

## Enlaces externos

El sitio puede incluir enlaces a sitios de terceros (por ejemplo, WhatsApp, Instagram o Google Maps). El titular no se responsabiliza por los contenidos ni por las políticas de esos sitios.

## Legislación aplicable

Estas condiciones se rigen por las leyes de la República Argentina.
`,
  },
  {
    slug: 'politica-de-privacidad',
    h1: 'Política de privacidad',
    title: 'Política de privacidad | {{NOMBRE}}',
    description: 'Cómo se tratan los datos personales de quienes visitan el sitio o se contactan por WhatsApp.',
    body: `
## Responsable

El responsable del tratamiento de datos es **${name}**, con domicilio en ${b.address}, ${b.city}, ${b.province}.

## Qué datos se recogen

- **Este sitio no almacena datos personales.** El formulario de turnos solo arma un mensaje que se abre en tu propia aplicación de WhatsApp; vos decidís si enviarlo.
- Los datos que compartas por WhatsApp o en la consulta se utilizan únicamente para gestionar turnos y para tu atención.
- ${config.gaId ? 'El sitio utiliza Google Analytics para obtener estadísticas de uso agregadas y anónimas.' : 'El sitio no utiliza cookies de seguimiento ni herramientas de analítica.'}

## Datos de salud

La información clínica que surja de la atención se trata con estricta confidencialidad y conforme al secreto profesional, la Ley 26.529 de Derechos del Paciente y la Ley 25.326 de Protección de los Datos Personales.

## Tus derechos

Podés solicitar el acceso, la rectificación o la supresión de tus datos escribiendo a ${config.contact.email || '[PENDIENTE: email de contacto]'}. La Agencia de Acceso a la Información Pública, en su carácter de órgano de control de la Ley 25.326, tiene la atribución de atender las denuncias y reclamos relacionados con el incumplimiento de las normas sobre protección de datos personales.

## Actualizaciones

Esta política puede actualizarse. La versión vigente es la publicada en esta página.
`,
  },
];
