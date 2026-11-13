/** Menú fijo: se vuelve sólido al bajar y marca la sección visible. */
export function initStickyNav(): void {
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  if (!nav) return;

  const sentinel = document.querySelector('[data-nav-sentinel]');
  if (sentinel) {
    new IntersectionObserver(([entry]) => nav.classList.toggle('is-solid', !entry.isIntersecting)).observe(sentinel);
  }

  const links = [...nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
  const byId = new Map<string, HTMLAnchorElement[]>();
  links.forEach((a) => {
    const id = a.hash.slice(1);
    if (id) byId.set(id, [...(byId.get(id) ?? []), a]);
  });

  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((l) => l.removeAttribute('aria-current'));
      byId.get(e.target.id)?.forEach((l) => l.setAttribute('aria-current', 'true'));
    }),
    { rootMargin: '-45% 0px -50% 0px' },
  );
  byId.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });

  const menu = nav.querySelector('details');
  menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => menu.removeAttribute('open')));
}
