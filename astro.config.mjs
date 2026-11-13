import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://manos-cerros.pages.dev', // o tu dominio
  integrations: [sitemap()],
  output: 'static'
});