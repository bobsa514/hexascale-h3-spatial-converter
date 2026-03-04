import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  base: '/hexascale-h3-spatial-converter/',
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
  }
});
