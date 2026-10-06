import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    legalComments: 'none',
  },
  server: {
    port: 58311,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:58310',
        changeOrigin: true,
      }
    }
  },
  preview: {
    port: 58311,
    host: true,
    allowedHosts: true,
  }
});