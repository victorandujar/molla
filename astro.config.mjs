import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  site: process.env.PUBLIC_SITE_URL || 'http://localhost:4321',
  vite: { plugins: [tailwindcss()] },
  devToolbar: { enabled: false },
  // Catalan became the main language: old Catalan URLs and the Spanish-only
  // pickup URL move permanently. `/` and `/poolish` are now Catalan pages.
  redirects: {
    '/ca': { status: 308, destination: '/' },
    '/ca/recollida': { status: 308, destination: '/recollida' },
    '/ca/poolish': { status: 308, destination: '/poolish' },
    '/recogida': { status: 308, destination: '/es/recogida' },
  },
});
