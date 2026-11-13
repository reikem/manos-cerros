/** Resalta en el dibujo del puesto la regla elegida en la lista. */
export function initStall(root: HTMLElement): void {
  const items = [...root.querySelectorAll<HTMLElement>('[data-rule]')];
  const spots = [...root.querySelectorAll<HTMLElement>('[data-spot]')];
  const select = (n: string) => {
    items.forEach((i) => { const on = i.dataset.rule === n; i.classList.toggle('is-on', on); i.setAttribute('aria-pressed', String(on)); });
    spots.forEach((s) => s.classList.toggle('is-on', s.dataset.spot === n));
  };
  items.forEach((i) => i.addEventListener('click', () => select(i.dataset.rule!)));
  spots.forEach((s) => s.addEventListener('click', () => select(s.dataset.spot!)));
  select('1');
}
