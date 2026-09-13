import { defineConfig } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173';
const backendURL = process.env.E2E_BACKEND_URL ?? 'http://127.0.0.1:3000';
const databaseURL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:5434/observatorio_ux';

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
      command: 'pnpm --filter backend start:dev',
      url: `${backendURL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: databaseURL,
        JWT_SECRET: process.env.JWT_SECRET ?? 'e2e_evaluador_secret_2026',
        JWT_PARTICIPANTE_SECRET:
          process.env.JWT_PARTICIPANTE_SECRET ?? 'e2e_participante_secret_2026',
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '1h',
        PORT: '3000',
        CORS_ORIGIN: baseURL,
      },
    },
    {
      command: 'pnpm --filter frontend dev --host 127.0.0.1',
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
