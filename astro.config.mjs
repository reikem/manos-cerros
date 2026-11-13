import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Si usas GitHub Pages sin un dominio propio configurado aún, lo ideal es:
  site: 'https://reikem.github.io',
  base: '/manos-cerros', // ¡Importante para que reconozca la sub-ruta del repositorio!
  
  integrations: [sitemap()],
  compressHTML: true,
  build: {
    inlineStylesheets: 'never',
  },
  vite: { build: { assetsInlineLimit: 0 } },
});