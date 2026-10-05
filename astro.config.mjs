import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import config from './site.config.js';
import postbuild from './scripts/postbuild.js';

// Sitio 100% estático: Astro pre-renderiza HTML (SEO intacto) y solo envía
// el JS de animaciones (GSAP + Lenis) como módulo diferido.
export default defineConfig({
  site: config.siteUrl,
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  compressHTML: true,
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  integrations: [postbuild()],
  vite: {
    plugins: [tailwindcss()],
  },
});
