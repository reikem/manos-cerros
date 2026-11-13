// Publica una opinión con límite por IP. Usa la SECRET KEY solo aquí (servidor), nunca en el navegador.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SECRET = Deno.env.get('SB_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SALT = Deno.env.get('IP_SALT') ?? '';
const ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const PER_HOUR = 3;
const PER_DAY = 8;
const MIN_FILL_MS = 3000;

const db = createClient(SUPABASE_URL, SECRET, { auth: { persistSession: false } });

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ORIGINS.includes(origin) ? origin : 'null',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
});
const reply = (status: number, body: unknown, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors(origin) } });

const sha256 = async (text: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))]
    .map((b) => b.toString(16).padStart(2, '0')).join('');
const clean = (s: unknown) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== 'POST') return reply(405, { error: 'Método no permitido.' }, origin);
  if (!origin || !ORIGINS.includes(origin)) return reply(403, { error: 'Origen no permitido.' }, origin);
  if (Number(req.headers.get('content-length') ?? 0) > 4096) return reply(413, { error: 'Mensaje demasiado largo.' }, origin);

  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return reply(400, { error: 'Solicitud inválida.' }, origin); }

  // Anti-bots: campo trampa vacío y tiempo mínimo para completar el formulario.
  if (clean(input.website) !== '' || Number(input.elapsed) < MIN_FILL_MS) return reply(400, { error: 'Solicitud inválida.' }, origin);

  const author = clean(input.author) || 'Vecino/a';
  const body = clean(input.body);
  const rating = Number(input.rating);
  if (author.length < 2 || author.length > 40) return reply(400, { error: 'El nombre debe tener entre 2 y 40 caracteres.' }, origin);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return reply(400, { error: 'Elige de 1 a 5 estrellas.' }, origin);
  if (body.length < 10 || body.length > 600) return reply(400, { error: 'La opinión debe tener entre 10 y 600 caracteres.' }, origin);
  if (/https?:\/\/|www\.|\.(com|cl|net|org|ru)\b/i.test(`${author} ${body}`)) return reply(400, { error: 'No se permiten enlaces.' }, origin);

  // Límite por IP (se guarda solo el hash con sal).
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'desconocida';
  const ip_hash = await sha256(`${SALT}:${ip}`);
  const since = (ms: number) => new Date(Date.now() - ms).toISOString();
  const count = async (ms: number) => {
    const { count } = await db.from('comments').select('id', { count: 'exact', head: true }).eq('ip_hash', ip_hash).gte('created_at', since(ms));
    return count ?? 0;
  };
  if ((await count(3_600_000)) >= PER_HOUR || (await count(86_400_000)) >= PER_DAY) {
    return reply(429, { error: 'Ya enviaste varias opiniones. Intenta de nuevo más tarde.' }, origin);
  }

  const { error } = await db.from('comments').insert({ author, rating, body, ip_hash });
  if (error) return reply(500, { error: 'No pudimos guardar tu opinión.' }, origin);
  return reply(201, { ok: true }, origin);
});
