const BASE = 'https://commons.wikimedia.org/wiki/Special:FilePath/';

/** URL de una imagen de Wikimedia Commons con el ancho solicitado. */
export const commonsSrc = (file: string, width = 1200): string =>
  `${BASE}${encodeURIComponent(file.replace(/ /g, '_'))}?width=${width}`;

/** Atributo srcset para imágenes responsivas. */
export const commonsSrcset = (file: string, widths: number[]): string =>
  widths.map((w) => `${commonsSrc(file, w)} ${w}w`).join(', ');

export const osmSearch = (query: string): string =>
  `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
