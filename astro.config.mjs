import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://reikem.github.io',
  base: '/manos-cerros', // <--- ¡Esta es la clave para GitHub Pages!
  integrations: [sitemap()],
  output: 'static'
});