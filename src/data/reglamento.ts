export interface Rule { title: string; text: string }
export interface RuleGroup { id: string; title: string; note?: string; rules: Rule[] }
export interface Hotspot { n: string; title: string; text: string; x: number; y: number }

export const reglamentoStatus = {
  title: 'Estado actual de la normativa',
  text: 'El 27 de octubre de 2026 la Corte de Apelaciones de Valparaíso dejó sin efecto la Ordenanza N.º 45 (causa Rol 101-2025) y ordenó al municipio dictar una nueva que defina los espacios habilitados y cuente con el informe del Consejo Comunal de Seguridad Pública. El municipio ha anunciado que recurrirá, por lo que esta información puede cambiar. Mientras tanto, rigen la Ley N.º 21.426 y las condiciones de los permisos vigentes.',
};

export const groups: RuleGroup[] = [
  {
    id: 'vigentes',
    title: 'Normas legales vigentes',
    note: 'Ley N.º 21.426 sobre comercio ilegal y normas generales.',
    rules: [
      { title: 'Permiso municipal personalísimo', text: 'La autorización es intransferible y temporal, y requiere tener al día el pago de los derechos municipales.' },
      { title: 'Nada en calzadas ni bermas', text: 'Se prohíbe ejercer comercio ambulante o estacionado en calzadas, bermas y vías de tránsito vehicular sin autorización expresa.' },
      { title: 'Autorización sanitaria para alimentos', text: 'Quien vende comida preparada o productos perecibles debe contar con la autorización sanitaria vigente del Ministerio de Salud.' },
      { title: 'Productos prohibidos', text: 'No se pueden vender cigarrillos, medicamentos, artículos falsificados ni especies de procedencia ilícita.' },
    ],
  },
  {
    id: 'referencia',
    title: 'Reglas de referencia (Ordenanza N.º 45, hoy anulada)',
    note: 'Eran las reglas operativas del municipio y sirven de base para la nueva redacción.',
    rules: [
      { title: 'Horario', text: 'De 08:00 a 18:30 horas, con un máximo de 8 horas diarias en bienes nacionales de uso público.' },
      { title: 'Puesto y mobiliario', text: 'Mesas de hasta 1,5 m de frente, 1,5 m de fondo y 0,8 m de alto. No se exhibe mercadería directamente en el suelo.' },
      { title: 'Dónde no instalarse', text: 'Aceras de menos de 2 m, vías de evacuación por tsunami, frente a grifos, colegios, servicios de urgencia, paraderos o el Congreso Nacional.' },
      { title: 'Giro comercial', text: 'Se restringía vender artículos que compitieran directamente con los locales establecidos de la misma cuadra.' },
      { title: 'Postulación y renovación', text: 'Ser mayor de 18 años, residir en Valparaíso, pertenecer al 40 % más vulnerable del Registro Social de Hogares y renovar el permiso cada 30 días.' },
    ],
  },
  {
    id: 'fiscalizacion',
    title: 'Fiscalización y sanciones',
    rules: [
      { title: 'Control en terreno', text: 'Inspectores municipales y Carabineros pueden pedir la cédula de identidad, el permiso vigente y las boletas o facturas de respaldo de la mercadería.' },
      { title: 'Multas y decomiso', text: 'Trabajar fuera del rubro, en lugares prohibidos o sin el permiso al día puede significar multas de 0,5 a 2 UTM (de 2 a 4 UTM si hay reincidencia), decomiso y revocación del permiso.' },
    ],
  },
];

export const hotspots: Hotspot[] = [
  { n: '1', title: 'Mesa de hasta 1,5 × 1,5 × 0,8 m', text: 'El puesto se instala en una mesa dentro de estas medidas.', x: 50, y: 50 },
  { n: '2', title: 'Nada de mercadería en el suelo', text: 'Todo se exhibe sobre la mesa, ordenado y sin obstruir el paso.', x: 11, y: 79 },
  { n: '3', title: 'Credencial visible', text: 'La credencial municipal con su QR se exhibe siempre, para que cualquiera pueda verificarla.', x: 50, y: 71 },
  { n: '4', title: 'Horario: 08:00 a 18:30', text: 'Máximo 8 horas diarias. Antes de irnos, dejamos la esquina limpia.', x: 89, y: 17 },
  { n: '5', title: 'Aceras de al menos 2 m', text: 'No nos instalamos donde el paso peatonal quede estrecho, ni frente a grifos, colegios o paraderos.', x: 50, y: 93 },
  { n: '6', title: 'Boletas o facturas al día', text: 'Llevamos el respaldo de la mercadería para mostrarlo si nos fiscalizan.', x: 78, y: 62 },
];

export const sources = [
  { label: 'Fallo: Corte deja sin efecto la ordenanza (G5 Noticias)', href: 'https://g5noticias.cl/2026/10/28/corte-de-valparaiso-deja-sin-efecto-ordenanza-de-comercio-ambulante-y-obliga-al-municipio-a-dictar-una-nueva/' },
  { label: 'Noticia: Corte de Valparaíso anula la ordenanza (UCV Radio)', href: 'https://ucvradio.cl/news/corte-de-valparaiso-anula-ordenanza-de-comercio-ambulante-y-exige-nueva-regulacion-municipal/' },
  { label: 'Ordenanza N.º 45 (PDF, Municipalidad de Valparaíso)', href: 'https://municipalidaddevalparaiso.cl/wp-content/uploads/2025/06/N%C2%B045-Ordenanza-que-regula-comercio-en-BNUP.pdf' },
  { label: 'Guía sobre la Ley N.º 21.426 (CNC)', href: 'https://cnc.cl/wp-content/uploads/2022/05/Comercio-Ilgeal.pdf' },
  { label: 'Autorización sanitaria para vendedores ambulantes (ChileAtiende)', href: 'https://www.chileatiende.gob.cl/fichas/16578-autorizacion-sanitaria-para-vendedores-ambulantes-de-alimentos' },
];
