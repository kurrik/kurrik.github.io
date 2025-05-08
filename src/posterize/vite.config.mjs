import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import sveltePreprocess from 'svelte-preprocess';

export default defineConfig({
  plugins: [
    svelte({
      // Enable TypeScript preprocessing in Svelte components
      preprocess: sveltePreprocess({
        typescript: true,
        sourceMap: true
      }),
      // Compiler options
      compilerOptions: {
        dev: process.env.NODE_ENV !== 'production'
      }
    })
  ],
  base: '/posterize/',
  build: {
    outDir: '../../dist/posterize',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html')
      }
    }
  },
  server: {
    // Configure dev server
    port: 3000,
    open: '/posterize/',
    fs: {
      // Allow serving files from one level up from the package root
      allow: ['..', '../..']
    }
  },
  resolve: {
    dedupe: ['svelte'],
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.svelte']
  }
});
