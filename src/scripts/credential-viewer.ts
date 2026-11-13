import { attachTilt } from './tilt';
import { between } from './lightbox';

const EASE = 'cubic-bezier(.2,.8,.2,1)';
const reduceMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;
let opened = false;

/** Credencial en miniatura: se inclina con el puntero y al hacer clic se acerca para girarla. */
export function initCredential(card: HTMLElement): void {
  const tilt = card.querySelector<HTMLElement>('[data-tilt]');
  if (tilt) attachTilt(tilt, 12);
  let sx = 0, sy = 0;
  card.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
  card.addEventListener('click', (e) => {
    if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) < 8 || e.detail === 0) open(card);
  });
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(card); }
  });
}

function open(card: HTMLElement): void {
  if (opened) return;
  opened = true;
  const scene = card.querySelector<HTMLElement>('[data-scene]')!;
  const origin = scene.getBoundingClientRect();

  const overlay = document.createElement('div');
  overlay.className = 'cv';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Credencial ampliada. Arrastra o toca para girarla.');

  const wrap = document.createElement('div');
  wrap.className = 'cv__wrap';
  const clone = scene.cloneNode(true) as HTMLElement;
  clone.classList.add('is-zoom');
  const flipEl = clone.querySelector<HTMLElement>('[data-flip]')!;
  const tiltEl = clone.querySelector<HTMLElement>('[data-tilt]');
  ['--rx', '--ry', '--s'].forEach((k) => tiltEl?.style.removeProperty(k));
  wrap.append(clone);

  const hint = document.createElement('p');
  hint.className = 'cv__hint';
  hint.textContent = 'Arrastra para girar · toca la credencial para voltearla';
  const bar = document.createElement('div');
  bar.className = 'cv__bar';
  const turn = document.createElement('button');
  turn.type = 'button'; turn.textContent = 'Girar credencial';
  const close = document.createElement('button');
  close.type = 'button'; close.textContent = 'Cerrar'; close.className = 'cv__close';
  bar.append(turn, close);
  overlay.append(wrap, hint, bar);
  document.body.append(overlay);
  document.body.classList.add('bloq');
  card.style.visibility = 'hidden';

  // Animación de entrada: la credencial vuela desde su lugar hasta el centro.
  const final = wrap.getBoundingClientRect();
  requestAnimationFrame(() => overlay.classList.add('on'));
  wrap.animate([{ transform: between(final, origin) }, { transform: 'none' }], { duration: reduceMotion() ? 1 : 700, easing: EASE });
  close.focus({ preventScroll: true });

  // Giro: ángulo continuo que siempre termina en 0° (frente) o 180° (reverso).
  let angle = 0;
  const apply = (a: number) => flipEl.style.setProperty('--ang', `${a}deg`);
  const settle = (a: number) => {
    angle = Math.round(a / 180) * 180;
    clone.classList.add('flipping');
    apply(angle);
    window.setTimeout(() => clone.classList.remove('flipping'), 900);
  };
  turn.addEventListener('click', () => settle(angle + 180));

  let startX = 0, startAngle = 0, dragging = false, moved = false;
  clone.addEventListener('pointerdown', (e) => {
    dragging = true; moved = false; startX = e.clientX; startAngle = angle;
    clone.classList.add('drag');
    clone.setPointerCapture(e.pointerId);
  });
  clone.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 5) moved = true;
    apply(startAngle + dx * 0.55);
  });
  const release = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    clone.classList.remove('drag');
    const dx = e.clientX - startX;
    settle(moved ? startAngle + dx * 0.55 : startAngle + 180);
  };
  clone.addEventListener('pointerup', release);
  clone.addEventListener('pointercancel', release);

  const dismiss = () => {
    document.removeEventListener('keydown', onKey);
    overlay.classList.remove('on');
    const back = wrap.animate(
      [{ transform: 'none' }, { transform: between(wrap.getBoundingClientRect(), card.querySelector<HTMLElement>('[data-scene]')!.getBoundingClientRect()) }],
      { duration: reduceMotion() ? 1 : 520, easing: EASE, fill: 'forwards' },
    );
    back.onfinish = () => {
      card.style.visibility = '';
      overlay.remove();
      document.body.classList.remove('bloq');
      opened = false;
      card.focus({ preventScroll: true });
    };
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') dismiss();
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); settle(angle + 180); }
    else if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === close ? turn : close).focus(); }
  };
  document.addEventListener('keydown', onKey);
  close.addEventListener('click', dismiss);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) dismiss(); });
}
