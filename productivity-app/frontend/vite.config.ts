import { defineConfig } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** Browsers request /favicon.ico by default; redirect to the SVG mark in public/. */
function faviconRedirect() {
  const redirect = (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void
  ) => {
    const url = req.url ?? '';
    if (url === '/favicon.ico' || url.startsWith('/favicon.ico?')) {
      res.statusCode = 302;
      res.setHeader('Location', '/logo.svg');
      res.end();
      return;
    }
    next();
  };
  return {
    name: 'favicon-redirect',
    configureServer(server: { middlewares: { use: (fn: typeof redirect) => void } }) {
      server.middlewares.use(redirect);
    },
    configurePreviewServer(server: { middlewares: { use: (fn: typeof redirect) => void } }) {
      server.middlewares.use(redirect);
    },
  };
}

// Standard multi-file build (JS + CSS in dist/assets/). Avoid single-file inlining for normal
// HTTP hosting — large inline <script>/<style> often breaks under strict CSP or proxy limits.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), faviconRedirect()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Predictable names for verification; safe cache busting via hashed filenames.
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1200,
  },
});
