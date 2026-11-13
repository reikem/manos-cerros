/** Todo el contenido editable de la página vive aquí. */
export interface TimelineItem { time: string; title: string; text: string }
export interface Pillar { title: string; text: string }
export interface Testimonial { name: string; role: string; quote: string }
export interface Place { name: string; zone: string; query: string }
export interface Photo { file: string; alt: string; caption: string }

export const site = {
  name: 'Manos del Cerro',
  locale: 'es_CL',
  title: 'Manos del Cerro · Comerciantes ambulantes de Valparaíso',
  description:
    'Agrupación de comerciantes ambulantes de Valparaíso que trabaja, cuida y defiende las calles del puerto. Conoce nuestra historia y apóyanos.',
  whatsapp: 'https://wa.me/56900000000',
  email: 'contacto@manosdelcerro.cl',
  map: { lat: -33.0398, lon: -71.6285, bbox: '-71.6700,-33.0600,-71.5900,-33.0200' },
} as const;

export const heroSlides: Photo[] = [
  { file: 'Vista de Valparaíso desde el Cerro Florida - 2.jpg', alt: 'Vista de los cerros y la bahía de Valparaíso', caption: 'Cerro Florida' },
  { file: 'Panorama Puerto Valvaraiso 10 2007 196.jpg', alt: 'Panorámica del puerto de Valparaíso', caption: 'El puerto' },
  { file: 'Cerro Concepcion.jpg', alt: 'Casas del Cerro Concepción, Valparaíso', caption: 'Cerro Concepción' },
  { file: 'Avenida Alemania, Valparaiso 20240214.jpg', alt: 'Avenida Alemania, Valparaíso', caption: 'Avenida Alemania' },
];

export const images = {
  hero: heroSlides[0],
  cta: { file: 'Panorama Puerto Valvaraiso 10 2007 196.jpg', alt: '' },
  mosaic: [
    { file: 'Ascensor Artillería.jpg', alt: 'Ascensor Artillería, Valparaíso', caption: 'Ascensor Artillería' },
    { file: 'Cerro Concepcion.jpg', alt: 'Cerro Concepción, Valparaíso', caption: 'Cerro Concepción' },
    { file: 'Avenida Alemania, Valparaiso 20240214.jpg', alt: 'Avenida Alemania, Valparaíso', caption: 'Avenida Alemania' },
  ] satisfies Photo[],
};

export const manifesto =
  'Hace generaciones que Valparaíso se camina con un canasto en el brazo. Vendemos sopaipillas, flores, fruta, artesanía y café en las mismas esquinas donde empiezan los ascensores. No somos un problema de la ciudad: somos su paisaje, su ritmo y su memoria. Queremos seguir trabajando con dignidad y dejar cada calle más limpia de como la encontramos.';

export const timeline: TimelineItem[] = [
  { time: '6:00', title: 'Subimos el cerro', text: 'Llegamos antes de que la niebla se levante, con el carro a cuestas y el termo lleno.' },
  { time: '8:00', title: 'Armamos el puesto', text: 'Cada persona conoce su metro de vereda. Es un acuerdo que se cuida entre vecinos.' },
  { time: '13:00', title: 'Atendemos a la ciudad', text: 'Estudiantes, turistas, oficinistas y familias del cerro pasan por nuestros puestos.' },
  { time: '19:00', title: 'Barremos la calle', text: 'Antes de irnos recogemos, regamos las plantas y dejamos la esquina impecable.' },
];

export const pillars: Pillar[] = [
  { title: 'Trabajar', text: 'Un permiso justo y estable para quienes llevamos años en la misma esquina, sin el temor de perder el sustento de un día para otro.' },
  { title: 'Cuidar', text: 'Turnos de limpieza, maceteros y reciclaje en cada cuadra donde vendemos. Cuidar la calle es cuidar nuestro trabajo.' },
  { title: 'Quedarnos', text: 'Valparaíso sin su gente de calle perdería su voz. Queremos ser parte de su futuro, no solo de su postal.' },
];

// Testimonios de ejemplo: reemplázalos por los reales (con permiso de cada persona).
export const testimonials: Testimonial[] = [
  { name: 'Rosa Muñoz', role: 'Vendedora de flores, 34 años en la misma esquina', quote: 'Mi mamá vendía flores en esta esquina y aquí aprendí a atarlas. Cada tarde barro mi vereda y la de mi vecino. No pedimos privilegios: pedimos seguir trabajando.' },
  { name: 'Mario Ibarra', role: 'Sopaipillero, 31 años en el oficio', quote: 'Hay clientes que me conocen desde que eran escolares y hoy vienen con sus hijos. Cuando subo el cerro a las seis de la mañana siento que ayudo a abrir la ciudad.' },
  { name: 'Camila Reyes', role: 'Artesana y madre, 29 años', quote: 'Con mi puesto pago el arriendo y los útiles de mi hija. Una feria ordenada, con turnos y limpieza, nos cuida a todos: a los vecinos, a los turistas y a nosotros.' },
  { name: 'Patricia Salinas', role: 'Vecina del Cerro Alegre', quote: 'Al principio dudaba. Hoy compro mi fruta ahí cada semana. Cuando alguien falta, se nota: esa esquina sin ellos no estaría más limpia, estaría más sola.' },
];

export const places: Place[] = [
  { name: 'Plaza Sotomayor', zone: 'El Plan', query: 'Plaza Sotomayor, Valparaíso' },
  { name: 'Plaza Aníbal Pinto', zone: 'El Plan', query: 'Plaza Aníbal Pinto, Valparaíso' },
  { name: 'Paseo Gervasoni', zone: 'Cerro Concepción', query: 'Paseo Gervasoni, Valparaíso' },
  { name: 'Paseo Yugoslavo', zone: 'Cerro Alegre', query: 'Paseo Yugoslavo, Valparaíso' },
  { name: 'Plaza Victoria', zone: 'El Almendral', query: 'Plaza Victoria, Valparaíso' },
];

export const nav = [
  { href: '#manifiesto', label: 'Quiénes somos' },
  { href: '#verificar', label: 'Verificar' },
  { href: '#reglamento', label: 'Reglamento' },
  { href: '#voces', label: 'Voces' },
  { href: '#opiniones', label: 'Opiniones' },
  { href: '#mapa', label: 'Mapa' },
  { href: '#sumate', label: 'Súmate' },
];
