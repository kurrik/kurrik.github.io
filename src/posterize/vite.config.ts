import { defineConfig } from 'vite';
import { resolve } from 'path';
// Will be enabled when we install Svelte dependencies
// import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  root: '.',
  base: '/posterize',
  // Will be enabled when we install Svelte dependencies
  // plugins: [svelte()],
  build: {
    outDir: resolve(__dirname, '../../dist/posterize'),
    emptyOutDir: true,
    sourcemap: true,
  },
  optimizeDeps: {
    exclude: [/* 'svelte' */],  // Will be enabled when we install Svelte
  },
  server: {
    open: '/posterize/index.html',
    port: 3000,
  },
});
