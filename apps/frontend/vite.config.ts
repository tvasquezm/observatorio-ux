import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';

// Identifica cada compilación: el commit que despliega Vercel o, si no hay, la hora de la compilación.
// La aplicación compara su propio identificador con `version.json` para avisar cuando hay una versión nueva.
const fechaDeCompilacion = new Date().toISOString().slice(0, 10);
const idDeVersion = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? Date.now().toString(36);

function archivoDeVersion(): Plugin {
  return {
    name: 'archivo-de-version',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: idDeVersion, fecha: fechaDeCompilacion }) });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [archivoDeVersion()],
    define: {
      __APP_VERSION__: JSON.stringify(idDeVersion),
      __APP_BUILD_DATE__: JSON.stringify(fechaDeCompilacion),
    },
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
