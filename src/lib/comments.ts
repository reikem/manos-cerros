import { config } from '../config';

export interface PublicComment { id: string; author: string; rating: number; body: string; created_at: string }
export interface Stats { total: number; avg: number; r1: number; r2: number; r3: number; r4: number; r5: number }
export interface NewComment { author: string; rating: number; body: string; website: string; elapsed: number }

export const commentsEnabled = (): boolean => Boolean(config.supabaseUrl && config.supabaseKey);

const headers = (): HeadersInit => ({ apikey: config.supabaseKey, Accept: 'application/json' });

export async function fetchComments(offset = 0, limit = 10): Promise<PublicComment[]> {
  const q = `select=id,author,rating,body,created_at&order=created_at.desc&offset=${offset}&limit=${limit}`;
  const res = await fetch(`${config.supabaseUrl}/rest/v1/comments_public?${q}`, { headers: headers() });
  if (!res.ok) throw new Error('comments');
  return res.json();
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${config.supabaseUrl}/rest/v1/comment_stats?select=*`, { headers: headers() });
  if (!res.ok) throw new Error('stats');
  const [row] = (await res.json()) as Stats[];
  return row ?? { total: 0, avg: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 };
}

export type PostResult = { ok: true } | { ok: false; status: number; message: string };

/** Las opiniones se publican a través de una Edge Function que limita por IP y valida el contenido. */
export async function postComment(c: NewComment): Promise<PostResult> {
  try {
    const res = await fetch(`${config.supabaseUrl}/functions/v1/post-comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: config.supabaseKey },
      body: JSON.stringify(c),
    });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, status: res.status, message: data.error ?? 'No pudimos publicar tu opinión.' };
  } catch {
    return { ok: false, status: 0, message: 'Sin conexión. Intenta de nuevo en un momento.' };
  }
}
