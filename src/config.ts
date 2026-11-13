/** Configuración pública (se incrusta en el navegador). Nunca pongas claves secretas aquí. */
export const config = {
  /** Solo para los comentarios (src/lib/comments.ts). La verificación del QR NO usa Supabase. */
  supabaseUrl: import.meta.env.PUBLIC_SUPABASE_URL || 'https://pzvwjqqxxwkwvappvuex.supabase.co',
  supabaseKey: import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  /**
   * Misma API que abre el QR de la credencial (yopagoenvalpo.cl). El N° de arriendo se saca del QR.
   * Si el navegador la bloquea por CORS, define PUBLIC_VERIFY_API con la URL de un proxy.
   */
  verifyApi:
    import.meta.env.PUBLIC_VERIFY_API ||
    'https://yopagoenvalpo.cl/api/provisorias/provisorias/PorNumeroArriendo',
} as const;