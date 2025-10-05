import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/signal': {
        target: 'ws://localhost:10000',
        ws: true,
        changeOrigin: true,
      },
      '/yjs': {
        target: 'ws://localhost:10000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});