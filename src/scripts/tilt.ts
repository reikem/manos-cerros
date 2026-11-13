const reduceMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Inclinación 3D + brillo holográfico que sigue al puntero (mouse, lápiz o dedo). */
export function attachTilt(el: HTMLElement, maxDeg = 26): void {
  const set = (name: string, value: string) => el.style.setProperty(name, value);

  const move = (e: PointerEvent) => {
    if (reduceMotion()) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.classList.add('mueve');
    set('--ry', `${((x - 0.5) * maxDeg).toFixed(2)}deg`);
    set('--rx', `${((0.5 - y) * maxDeg).toFixed(2)}deg`);
    set('--mx', `${(x * 100).toFixed(1)}%`);
    set('--my', `${(y * 100).toFixed(1)}%`);
    set('--bx', `${(x * 100).toFixed(1)}%`);
    set('--by', `${(y * 100).toFixed(1)}%`);
    set('--s', '1.05');
    set('--o', '.85');
  };

  const reset = () => {
    el.classList.remove('mueve');
    ['--rx', '--ry', '--o'].forEach((k) => set(k, '0'));
    set('--s', '1');
    set('--mx', '50%');
    set('--my', '50%');
  };

  el.addEventListener('pointermove', move);
  el.addEventListener('pointerdown', move);
  el.addEventListener('pointerleave', reset);
  el.addEventListener('pointercancel', reset);
  el.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') reset(); });
  el.addEventListener('focus', () => { set('--o', '.6'); set('--s', '1.04'); });
  el.addEventListener('blur', reset);
}
