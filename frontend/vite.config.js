import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const rootDir = dirname(fileURLToPath(import.meta.url));
  const env = loadEnv(mode, rootDir, '');
  const apiTarget = env.VITE_API_TARGET || 'http://127.0.0.1:3001';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
