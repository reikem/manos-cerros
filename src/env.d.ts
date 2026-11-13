/// <reference types="astro/client" />
interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly PUBLIC_VERIFY_API?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }
