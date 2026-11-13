const reduceMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface CarouselOptions { interval?: number }

/** Carrusel accesible: autoplay con pausa, flechas, puntos, teclado y deslizar con el dedo. */
export function initCarousel(root: HTMLElement, { interval = 6500 }: CarouselOptions = {}): void {
  const slides = [...root.querySelectorAll<HTMLElement>('[data-slide]')];
  const dots = [...root.querySelectorAll<HTMLButtonElement>('[data-dot]')];
  const counter = root.querySelector<HTMLElement>('[data-counter]');
  const caption = root.querySelector<HTMLElement>('[data-caption-out]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-toggle]');
  if (slides.length < 2) return;

  let index = 0;
  let timer: number | undefined;
  let playing = !reduceMotion();
  root.style.setProperty('--interval', `${interval}ms`);

  const go = (n: number) => {
    index = (n + slides.length) % slides.length;
    slides.forEach((s, k) => {
      s.classList.toggle('is-active', k === index);
      s.setAttribute('aria-hidden', String(k !== index));
    });
    dots.forEach((d, k) => (k === index ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
    if (counter) counter.textContent = String(index + 1).padStart(2, '0');
    if (caption) caption.textContent = slides[index].dataset.caption ?? '';
  };

  const stop = () => window.clearTimeout(timer);
  const schedule = () => {
    stop();
    if (playing && !document.hidden) timer = window.setTimeout(() => { go(index + 1); schedule(); }, interval);
  };
  const goTo = (n: number) => { go(n); schedule(); };

  const paint = () => {
    root.classList.toggle('is-paused', !playing);
    if (!toggle) return;
    toggle.textContent = playing ? '❚❚' : '▶';
    toggle.setAttribute('aria-label', playing ? 'Pausar rotación' : 'Reanudar rotación');
    toggle.setAttribute('aria-pressed', String(!playing));
  };

  root.querySelector('[data-prev]')?.addEventListener('click', () => goTo(index - 1));
  root.querySelector('[data-next]')?.addEventListener('click', () => goTo(index + 1));
  dots.forEach((d, k) => d.addEventListener('click', () => goTo(k)));
  toggle?.addEventListener('click', () => { playing = !playing; paint(); schedule(); });
  document.addEventListener('visibilitychange', schedule);
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goTo(index - 1);
    if (e.key === 'ArrowRight') goTo(index + 1);
  });

  // Deslizar con el dedo o el mouse
  let startX = 0, tracking = false;
  root.addEventListener('pointerdown', (e) => {
    tracking = !(e.target as HTMLElement).closest('a,button');
    startX = e.clientX;
  });
  root.addEventListener('pointerup', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 50) goTo(index + (dx < 0 ? 1 : -1));
  });

  paint();
  schedule();
}
