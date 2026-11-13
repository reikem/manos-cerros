import { commentsEnabled, fetchComments, fetchStats, postComment, type PublicComment, type Stats } from '../lib/comments';

const date = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' });
const PAGE = 10;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
function stars(rating: number): HTMLElement {
  const s = el('span', 'stars', '★★★★★');
  s.style.setProperty('--r', String(rating));
  s.setAttribute('role', 'img');
  s.setAttribute('aria-label', `${String(rating).replace('.', ',')} de 5 estrellas`);
  return s;
}

function renderStats(box: HTMLElement, s: Stats): void {
  box.replaceChildren();
  const top = el('div', 'sum__top');
  top.append(el('strong', 'sum__avg', s.total ? s.avg.toFixed(1).replace('.', ',') : '–'), stars(s.avg),
    el('span', 'sum__n', `${s.total} ${s.total === 1 ? 'opinión' : 'opiniones'}`));
  const bars = el('div', 'sum__bars');
  ([5, 4, 3, 2, 1] as const).forEach((n) => {
    const count = s[`r${n}`];
    const pct = s.total ? (count / s.total) * 100 : 0;
    const row = el('div', 'bar');
    const fill = el('span', 'bar__fill');
    fill.style.setProperty('--w', `${pct.toFixed(1)}%`);
    const track = el('span', 'bar__track');
    track.append(fill);
    row.append(el('span', 'bar__label', `${n} ★`), track, el('span', 'bar__count', String(count)));
    bars.append(row);
  });
  box.append(top, bars);
}

function card(c: PublicComment): HTMLElement {
  const a = el('article', 'op');
  const head = el('div', 'op__head');
  head.append(stars(c.rating), el('time', 'op__date', date.format(new Date(c.created_at))));
  a.append(head, el('p', 'op__body', c.body), el('p', 'op__by', `— ${c.author}`));
  return a;
}

export function initComments(root: HTMLElement): void {
  const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const list = q('[data-list]');
  const status = q('[data-status]');
  const summary = q('[data-summary]');
  const dialog = q<HTMLDialogElement>('[data-all]');
  const tbody = q('[data-rows]');
  const pager = q('[data-pager]');
  const dialogSummary = q('[data-summary-all]');
  const openedAt = performance.now();

  if (!commentsEnabled()) {
    list.textContent = 'Las opiniones aún no están configuradas.';
    q('[data-form]').setAttribute('hidden', '');
    return;
  }

  let total = 0;
  let stats: Stats | null = null;

  async function loadTop(): Promise<void> {
    try {
      const [s, rows] = await Promise.all([fetchStats(), fetchComments(0, PAGE)]);
      stats = s; total = s.total;
      renderStats(summary, s);
      list.replaceChildren(...(rows.length ? rows.map(card) : [el('p', 'empty', 'Aún no hay opiniones. ¡Sé la primera persona en escribir una!')]));
      q('[data-more]').hidden = total <= PAGE;
    } catch {
      list.replaceChildren(el('p', 'empty', 'No pudimos cargar las opiniones en este momento.'));
    }
  }

  // ---------- Tabla con todas las opiniones ----------
  let page = 0;
  async function loadPage(n: number): Promise<void> {
    page = n;
    tbody.replaceChildren();
    try {
      const rows = await fetchComments(n * PAGE, PAGE);
      rows.forEach((c) => {
        const tr = el('tr');
        const rate = el('td'); rate.append(stars(c.rating));
        tr.append(el('td', '', date.format(new Date(c.created_at))), el('td', '', c.author), rate, el('td', '', c.body));
        tbody.append(tr);
      });
    } catch { tbody.append(el('tr', '', 'Error al cargar.')); }
    const pages = Math.max(1, Math.ceil(total / PAGE));
    pager.replaceChildren();
    const prev = el('button', '', '← Anterior'); prev.type = 'button'; prev.disabled = page === 0;
    const next = el('button', '', 'Siguiente →'); next.type = 'button'; next.disabled = page >= pages - 1;
    prev.addEventListener('click', () => void loadPage(page - 1));
    next.addEventListener('click', () => void loadPage(page + 1));
    pager.append(prev, el('span', '', `Página ${page + 1} de ${pages}`), next);
  }
  q('[data-more]').addEventListener('click', () => {
    if (stats) renderStats(dialogSummary, stats);
    dialog.showModal();
    void loadPage(0);
  });
  q('[data-all-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  // ---------- Formulario ----------
  const form = q<HTMLFormElement>('[data-form]');
  const body = form.querySelector<HTMLTextAreaElement>('textarea')!;
  const counter = q('[data-count]');
  body.addEventListener('input', () => { counter.textContent = `${body.value.length}/600`; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const rating = Number(data.get('rating'));
    if (!rating) { status.textContent = 'Elige de 1 a 5 estrellas.'; return; }
    const last = Number(localStorage.getItem('opinion-ts') ?? 0);
    if (Date.now() - last < 30_000) { status.textContent = 'Espera un momento antes de enviar otra opinión.'; return; }
    const btn = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
    btn.disabled = true;
    status.textContent = 'Enviando…';
    const res = await postComment({
      author: String(data.get('author') ?? ''),
      rating,
      body: String(data.get('body') ?? ''),
      website: String(data.get('website') ?? ''),
      elapsed: Math.round(performance.now() - openedAt),
    });
    btn.disabled = false;
    if (res.ok) {
      try { localStorage.setItem('opinion-ts', String(Date.now())); } catch { /* modo privado */ }
      form.reset(); counter.textContent = '0/600';
      status.textContent = '¡Gracias por tu opinión!';
      void loadTop();
    } else {
      status.textContent = res.message;
    }
  });

  void loadTop();
}
