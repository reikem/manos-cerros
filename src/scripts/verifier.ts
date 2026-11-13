import { extractRentalId, fetchProvisoria, log, formatCLP, getDireccion, getMetraje, isActive, maskRut, paymentLabel, VerifyError, type Provisoria } from '../lib/credential';
import { initCredential } from './credential-viewer';

interface QrDetector { detect(src: CanvasImageSource): Promise<{ rawValue: string }[]> }
type DetectorCtor = new (o: { formats: string[] }) => QrDetector;

const MESSAGES: Record<string, string> = {
  invalid_qr: 'Ese código no corresponde a una credencial municipal de comercio.',
  not_found: 'No encontramos un permiso con ese número. Revisa que sea el QR de la credencial.',
  network: 'No pudimos conectar con el sistema municipal. Revisa tu conexión e inténtalo otra vez.',
  server: 'El sistema municipal no está respondiendo. Inténtalo más tarde.',
};

function cameraError(err: unknown): string {
  switch ((err as DOMException)?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'No diste permiso para usar la cámara. Habilítala desde el candado de la barra del navegador (o en Ajustes, si estás en el celular) y vuelve a intentar.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No encontramos una cámara en este dispositivo. Puedes subir una foto del QR o escribir el número.';
    case 'NotReadableError':
      return 'La cámara está siendo usada por otra aplicación. Ciérrala e inténtalo de nuevo.';
    default:
      return 'No pudimos abrir la cámara. Prueba subiendo una foto del QR.';
  }
}

export function initVerifier(root: HTMLElement): void {
  const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const dialog = q<HTMLDialogElement>('[data-scan-dialog]');
  const video = q<HTMLVideoElement>('[data-video]');
  const scanMsg = q('[data-scan-msg]');
  const result = q('[data-result]');
  const msg = q('[data-msg]');
  const facts = q('[data-facts]');
  const card = q('[data-cred]');
  const tag = q('[data-tag]');
  initCredential(card);

  const set = (name: string, value: string) =>
    root.querySelectorAll<HTMLElement>(`[data-f="${name}"]`).forEach((el) => { el.textContent = value; });

  // ---------- Resultado ----------
  function show(p: Provisoria): void {
    const ok = isActive(p);
    set('nombre', p.nombres);
    set('rut', maskRut(p.Rut));
    set('direccion', getDireccion(p));
    set('giro', p.descripcion);
    set('numero', String(p.NumeroArriendo));
    set('metraje', getMetraje(p));
    set('deuda', formatCLP(p.deuda));
    set('estado', `${ok ? '✓ ' : '! '}${p.estado}`);
    set('pagos', paymentLabel(p));
    q('[data-f="estado"]').dataset.tone = ok ? 'ok' : 'warn';
    q('[data-f="pagos"]').dataset.tone = p.deuda > 0 ? 'warn' : 'ok';
    tag.textContent = 'Consultada en el sistema municipal';
    tag.dataset.live = 'true';
    result.dataset.state = 'ok';
    msg.textContent = ok
      ? 'Este comerciante tiene un permiso vigente en el sistema municipal. Compara el nombre y la foto con la credencial física.'
      : 'El permiso aparece con un estado distinto a VIGENTE. Si algo no calza, puedes consultarlo en el municipio.';
    facts.hidden = false;
    card.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  }

  async function verify(raw: string): Promise<void> {
    log('verify → inicio con:', raw);
    facts.hidden = true;
    result.dataset.state = 'loading';
    msg.textContent = 'Consultando el sistema municipal…';
    try {
      const id = extractRentalId(raw);
      if (!id) throw new VerifyError('invalid_qr');
      show(await fetchProvisoria(id));
      log('verify → resultado mostrado en pantalla');
    } catch (e) {
      log('verify → falló:', e instanceof VerifyError ? `VerifyError(${e.code})` : e);
      result.dataset.state = 'error';
      msg.textContent = MESSAGES[e instanceof VerifyError ? e.code : 'server'];
    }
  }

  // ---------- Decodificación del QR ----------
  const Detector = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  const detector = Detector ? new Detector({ formats: ['qr_code'] }) : null;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  async function decode(src: CanvasImageSource, w: number, h: number): Promise<string | null> {
    if (detector) {
      try {
        const v = (await detector.detect(src))[0]?.rawValue ?? null;
        if (v) log('decode → BarcodeDetector leyó:', v);
        return v;
      } catch (err) { log('decode → BarcodeDetector falló, uso jsQR:', err); }
    }
    const { default: jsQR } = await import('jsqr'); // se descarga solo cuando hace falta
    const scale = Math.min(1, 720 / Math.max(w, h));
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const v = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
    if (v) log('decode → jsQR leyó:', v);
    return v;
  }

  // ---------- Cámara ----------
  let stream: MediaStream | null = null;
  let running = false;
  let raf = 0;

  function stopCamera(): void {
    running = false;
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
  }

  async function openScanner(): Promise<void> {
    log('cámara → abriendo escáner | BarcodeDetector:', !!detector, '| HTTPS:', window.isSecureContext);
    scanMsg.textContent = 'Solicitando acceso a la cámara…';
    dialog.showModal();
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      scanMsg.textContent = 'Este navegador no permite usar la cámara aquí (se necesita una conexión segura HTTPS). Sube una foto del QR o escribe el número.';
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch (err) {
      log('cámara → error:', (err as DOMException)?.name, err);
      scanMsg.textContent = cameraError(err);
      return;
    }
    video.srcObject = stream;
    await video.play().catch(() => undefined);
    scanMsg.textContent = 'Apunta la cámara al código QR de la credencial.';
    running = true;
    let last = 0, busy = false;
    const loop = async (ts: number) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (busy || ts - last < 140 || video.readyState < 2) return;
      last = ts; busy = true;
      try {
        const text = await decode(video, video.videoWidth, video.videoHeight);
        if (text && running) { stopCamera(); dialog.close(); void verify(text); }
      } finally { busy = false; }
    };
    raf = requestAnimationFrame(loop);
  }

  q('[data-scan-open]').addEventListener('click', () => void openScanner());
  q('[data-scan-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', stopCamera);
  document.addEventListener('visibilitychange', () => { if (document.hidden && dialog.open) dialog.close(); });

  // ---------- Foto del QR ----------
  q<HTMLInputElement>('[data-file]').addEventListener('change', async (e) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    log('foto → archivo:', file.name, file.type, `${Math.round(file.size / 1024)} KB`);
    result.dataset.state = 'loading';
    msg.textContent = 'Leyendo el código de la foto…';
    try {
      const bmp = await createImageBitmap(file);
      const text = await decode(bmp, bmp.width, bmp.height);
      bmp.close();
      if (!text) { log('foto → no se encontró ningún QR'); result.dataset.state = 'error'; msg.textContent = 'No encontramos un código QR en la foto. Intenta con una imagen más nítida y de cerca.'; return; }
      await verify(text);
    } catch {
      result.dataset.state = 'error';
      msg.textContent = 'No pudimos leer esa imagen.';
    }
  });

  // ---------- Número manual ----------
  q<HTMLFormElement>('[data-manual]').addEventListener('submit', (e) => {
    e.preventDefault();
    const value = q<HTMLInputElement>('[data-manual-input]').value;
    log('manual → número ingresado:', value);
    void verify(value);
  });
}