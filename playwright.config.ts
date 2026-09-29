import { defineConfig } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5174';
const backendURL = process.env.E2E_BACKEND_URL ?? 'http://127.0.0.1:3001';
const databaseURL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:5434/observatorio_ux_e2e';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'line',
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter backend exec prisma generate && pnpm --filter backend start:dev',
      url: `${backendURL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: databaseURL,
        JWT_SECRET: process.env.JWT_SECRET ?? 'e2e_evaluador_secret_2026_min_32_chars',
        JWT_PARTICIPANTE_SECRET:
          process.env.JWT_PARTICIPANTE_SECRET ?? 'e2e_participante_secret_2026_min_32_chars',
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '1h',
        PORT: new URL(backendURL).port || '3001',
        CORS_ORIGIN: baseURL,
      },
    },
    {
      command: `pnpm --filter frontend dev --host 127.0.0.1 --port ${new URL(baseURL).port || '5174'}`,
      url: `${baseURL}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_DEV_API_PROXY_TARGET: backendURL,
      },
    },
  ],
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
});
