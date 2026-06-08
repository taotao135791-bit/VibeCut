import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// 支持通过 BACKEND_PORT 环境变量切换后端端口（默认 8000）
const BACKEND_PORT = process.env.BACKEND_PORT || '8000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
      },
      '/ws': {
        target: `ws://localhost:${BACKEND_PORT}`,
        ws: true,
      },
    },
  },
});
