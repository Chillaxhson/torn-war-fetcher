import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/public',
  build: {
    outDir: '../../dist/public',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
}); 
