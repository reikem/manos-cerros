import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Cambia "site" por tu dominio real: lo usan el canonical, el sitemap y Open Graph.
export default defineConfig({
  site: 'https://manosdelcerro.cl',
  integrations: [sitemap()],
  compressHTML: true,
  build: {
    // CSS y JS siempre como archivos externos con hash: permite una CSP estricta
    // (sin 'unsafe-inline' en scripts) y caché inmutable en el CDN.
    inlineStylesheets: 'never',
  },
  vite: { build: { assetsInlineLimit: 0 } },
});
