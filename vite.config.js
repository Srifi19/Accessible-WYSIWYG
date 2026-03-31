import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'WYSIWYGEditor',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: [],
    }
  }
});
