import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  base: '/',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': '{}'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      buffer: 'buffer',
      util: 'util',
      stream: 'stream-browserify',
    }
  },
  optimizeDeps: {
    include: ['buffer', 'process', 'util', 'stream-browserify'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // h3-js used by useExport — separate chunk, loaded on demand
          if (id.includes('node_modules/h3-js/')) return 'vendor-h3';
          // Leaflet only needed for map rendering — loads with ResultsView
          if (id.includes('node_modules/leaflet/') || id.includes('node_modules/react-leaflet/')) return 'vendor-leaflet';
        },
      },
    },
  }
});
