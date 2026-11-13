// Proxy hacia el sistema municipal: evita CORS, valida el ID y devuelve solo lo necesario.
// Desplegar con: supabase functions deploy verify --no-verify-jwt
const API = 'https://yopagoenvalpo.cl/api/provisorias/provisorias/PorNumeroArriendo'; // sin "?" final
const ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const hits = new Map<string, { n: number; t: number }>(); // límite simple por instancia
const LIMIT = 30; // consultas por minuto por IP

const cors = (origin: string | null): Record<string, string> => ({
  ...(origin && ORIGINS.includes(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Content-Type, Authorization, apikey',
  Vary: 'Origin',
});
const reply = (status: number, body: unknown, origin: string | null, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin), ...extra },
  });

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== 'GET') return reply(405, { error: 'Método no permitido.' }, origin);

  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'x';
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 60_000) hits.set(ip, { n: 1, t: now });
  else if (++h.n > LIMIT) return reply(429, { error: 'Demasiadas consultas.' }, origin);

  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!/^\d{1,10}$/.test(id)) return reply(400, { error: 'ID inválido.' }, origin);

  try {
    const res = await fetch(`${API}?id=${id}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return reply(res.status === 404 ? 404 : 502, { error: 'No encontrado.' }, origin);
    const data = await res.json().catch(() => null);
    const p = data?.provisoria;
    if (!p) return reply(404, { error: 'No encontrado.' }, origin);
    const { NumeroArriendo, nombres, Rut, direccion, metraje, descripcion, estado, deuda } = p;
    return reply(
      200,
      { provisoria: { NumeroArriendo, nombres, Rut, direccion, metraje, descripcion, estado, deuda } },
      origin,
      { 'Cache-Control': 'public, max-age=60' },
    );
  } catch {
    return reply(502, { error: 'El sistema municipal no responde.' }, origin);
  }
});