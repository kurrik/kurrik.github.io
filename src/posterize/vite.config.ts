import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: resolve(__dirname, '../../dist/posterize'),
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    open: '/posterize/index.html',
    port: 3000,
  },
});
