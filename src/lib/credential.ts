import { config } from "../config";

/** Logs de depuración: se activan abriendo la página con ?debug=1 (o en desarrollo). */
const DEBUG = import.meta.env.DEV || (typeof location !== 'undefined' && /[?&]debug(=|&|$)/.test(location.search));
export const log = (...args: unknown[]): void => { if (DEBUG) console.log('[QR]', ...args); };

/** Respuesta del sistema municipal (campos que usa la credencial). */
export interface Provisoria {
  NumeroArriendo: number;
  nombres: string;
  Rut: string;
  direccion: string;
  metraje?: string; // la API actual no lo envía; viene dentro de `direccion`
  descripcion: string;
  estado: string;
  deuda: number;
}

export type VerifyErrorCode = 'invalid_qr' | 'not_found' | 'network' | 'server';
export class VerifyError extends Error {
  constructor(public code: VerifyErrorCode) { super(code); }
}

const OFFICIAL_HOST = 'yopagoenvalpo.cl';
const ID_RE = /^\d{1,10}$/;

/**
 * Obtiene el N° de arriendo desde el texto del QR.
 * Acepta el número solo o la URL oficial del sistema (como la que trae la credencial).
 * Nunca se consulta la URL del QR: solo se extrae el número y se usa el endpoint fijo.
 */
export function extractRentalId(raw: string): string | null {
  const text = raw.trim();
  log('extractRentalId → texto recibido:', JSON.stringify(text));
  if (ID_RE.test(text)) { log('extractRentalId → es un número directo:', text); return text; }
  try {
    const url = new URL(text);
    const host = url.hostname.toLowerCase();
    if (host !== OFFICIAL_HOST && !host.endsWith(`.${OFFICIAL_HOST}`)) { log('extractRentalId → host no oficial:', host); return null; }
    const id = url.searchParams.get('id') ?? '';
    log('extractRentalId → URL oficial, id =', id);
    return ID_RE.test(id) ? id : null;
  } catch {
    log('extractRentalId → no es número ni URL válida');
    return null;
  }
}

function isProvisoria(x: unknown): x is Provisoria {
  const p = x as Partial<Provisoria> | null;
  return !!p && typeof p.NumeroArriendo === 'number' && typeof p.nombres === 'string' && typeof p.estado === 'string';
}

export async function fetchProvisoria(id: string): Promise<Provisoria> {
  const url = new URL(config.verifyApi);
  url.searchParams.set('id', id);
  log('fetchProvisoria → GET', url.toString());
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    log('fetchProvisoria → ERROR de red/CORS/timeout:', err);
    throw new VerifyError('network');
  }
  log('fetchProvisoria → status', res.status, '| CORS header:', res.headers.get('access-control-allow-origin'));
  if (res.status === 404) throw new VerifyError('not_found');
  if (!res.ok) throw new VerifyError('server');
  const data: unknown = await res.json().catch(() => null);
  log('fetchProvisoria → respuesta JSON:', data);
  const p = (data as { provisoria?: unknown } | null)?.provisoria ?? data;
  if (!isProvisoria(p)) { log('fetchProvisoria → la respuesta no tiene el formato esperado:', p); throw new VerifyError('not_found'); }
  log('fetchProvisoria → OK', { id: p.NumeroArriendo, nombre: p.nombres, estado: p.estado, deuda: p.deuda });
  return p;
}

/** "009263796-4" → "9.***.***-4": suficiente para comparar con la credencial sin exponer el RUT completo. */
export function maskRut(rut: string): string {
  const [bodyRaw = '', dv = ''] = rut.replace(/\./g, '').split('-');
  const body = bodyRaw.replace(/^0+/, '');
  const head = body.slice(0, Math.max(0, body.length - 6));
  return `${head || '*'}.***.***-${dv.toUpperCase()}`;
}

/** Metraje: usa el campo si viene; si no, lo extrae de "...METRAJE 2 X2 MTRS2". */
export const getMetraje = (p: Provisoria): string =>
  p.metraje ?? p.direccion.match(/METRAJE\s+(.+)$/i)?.[1]?.trim() ?? '';

/** Dirección sin el sufijo de metraje. */
export const getDireccion = (p: Provisoria): string =>
  p.direccion.replace(/\s*METRAJE\s+.+$/i, '').trim();

export const formatCLP = (n: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

export const paymentLabel = (p: Provisoria): string => (p.deuda > 0 ? 'Registra deuda pendiente' : 'Pagos al día');
export const isActive = (p: Provisoria): boolean => p.estado.trim().toUpperCase() === 'VIGENTE';