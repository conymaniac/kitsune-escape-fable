import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    target: 'es2020',
  },
});
