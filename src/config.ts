/** Configuración pública (se incrusta en el navegador). Nunca pongas claves secretas aquí. */
export const config = {
  supabaseUrl: import.meta.env.PUBLIC_SUPABASE_URL ?? '',
  supabaseKey: import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  /**
   * Endpoint de verificación. Usa el proxy (Edge Function) porque la API municipal no envía CORS.
   * Ej: https://TU-PROYECTO.supabase.co/functions/v1/verify
   */
  verifyApi:
    import.meta.env.PUBLIC_VERIFY_API ||
    'https://yopagoenvalpo.cl/api/provisorias/provisorias/PorNumeroArriendo',
} as const;