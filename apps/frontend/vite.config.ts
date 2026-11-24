import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // El contrato compartido se compila a CommonJS para el backend; el frontend lo toma directo del
    // código fuente (ESM) para que el empaquetado descarte lo que no usa (Zod pesa ~600 kB si entra entero).
    resolve: { alias: { '@observatorio-ux/shared-types': fileURLToPath(new URL('../../packages/shared-types/src/index.ts', import.meta.url)) } },
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
