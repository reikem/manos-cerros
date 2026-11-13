import { attachTilt } from './tilt';

const EASE = 'cubic-bezier(.2,.8,.2,1)';
const reduceMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

/** Transform que lleva un elemento desde su rect actual `cur` hasta el rect `target`. */
export function between(cur: DOMRect, target: DOMRect): string {
  const a = center(cur), b = center(target);
  return `translate(${b.x - a.x}px, ${b.y - a.y}px) scale(${target.width / cur.width})`;
}

let openCard: HTMLElement | null = null;

function open(card: HTMLElement): void {
  if (openCard) return;
  openCard = card;
  const origin = card.getBoundingClientRect();

  const overlay = document.createElement('div');
  overlay.className = 'zoom';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Testimonio ampliado');

  const wrap = document.createElement('div');
  wrap.className = 'zoom-wrap';
  const clone = card.cloneNode(true) as HTMLElement;
  ['tabindex', 'role', 'aria-label'].forEach((a) => clone.removeAttribute(a));
  ['--rx', '--ry', '--o'].forEach((k) => clone.style.setProperty(k, '0'));
  clone.style.setProperty('--s', '1');
  wrap.append(clone);

  const close = document.createElement('button');
  close.className = 'cierra';
  close.type = 'button';
  close.setAttribute('aria-label', 'Cerrar');
  close.innerHTML = '&times;';

  overlay.append(wrap, close);
  document.body.append(overlay);
  document.body.classList.add('bloq');
  attachTilt(clone);
  card.style.visibility = 'hidden';

  const final = wrap.getBoundingClientRect();
  requestAnimationFrame(() => overlay.classList.add('on'));
  wrap.animate([{ transform: between(final, origin) }, { transform: 'none' }], {
    duration: reduceMotion() ? 1 : 650,
    easing: EASE,
  });
  close.focus({ preventScroll: true });

  const dismiss = () => {
    if (openCard !== card) return;
    openCard = null;
    document.removeEventListener('keydown', onKey);
    overlay.classList.remove('on');
    const back = wrap.animate(
      [{ transform: 'none' }, { transform: between(wrap.getBoundingClientRect(), card.getBoundingClientRect()) }],
      { duration: reduceMotion() ? 1 : 500, easing: EASE, fill: 'forwards' },
    );
    back.onfinish = () => {
      card.style.visibility = '';
      overlay.remove();
      document.body.classList.remove('bloq');
      card.focus({ preventScroll: true });
    };
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') dismiss();
    if (e.key === 'Tab') { e.preventDefault(); close.focus(); }
  };
  document.addEventListener('keydown', onKey);
  close.addEventListener('click', dismiss);
  overlay.addEventListener('click', (e) => { if (!wrap.contains(e.target as Node)) dismiss(); });
}

/** Activa inclinación 3D y vista ampliada en todos los elementos que coincidan con `selector`. */
export function initCardLightbox(selector: string): void {
  document.querySelectorAll<HTMLElement>(selector).forEach((card) => {
    attachTilt(card);
    let sx = 0, sy = 0;
    card.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
    card.addEventListener('click', (e) => {
      const moved = Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy);
      if (moved < 8 || e.detail === 0) open(card);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(card); }
    });
  });
}
