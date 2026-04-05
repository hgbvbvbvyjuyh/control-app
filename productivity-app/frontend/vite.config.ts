import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Standard multi-file build (JS + CSS in dist/assets/). Avoid single-file inlining for normal
// HTTP hosting — large inline <script>/<style> often breaks under strict CSP or proxy limits.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
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
