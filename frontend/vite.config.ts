import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// El frontend habla con el backend por /api. En dev se hace proxy a localhost:4000.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
