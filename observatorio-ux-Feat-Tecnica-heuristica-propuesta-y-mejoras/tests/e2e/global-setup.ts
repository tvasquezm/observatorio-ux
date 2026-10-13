import { spawnSync } from 'node:child_process';

export default function globalSetup() {
  const isWindows = process.platform === 'win32';
  const databaseURL =
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@127.0.0.1:5434/observatorio_ux_e2e';
  if (!/_(e2e|test)$/.test(new URL(databaseURL).pathname)) {
    throw new Error('Las pruebas requieren una base terminada en _e2e o _test: el seed modifica los datos demo.');
  }
  const environment = { ...process.env, DATABASE_URL: databaseURL };

  for (const args of [
    ['--filter', 'backend', 'exec', 'prisma', 'migrate', 'deploy'],
    ['--filter', 'backend', 'seed'],
  ]) {
    const executable = isWindows ? (process.env.ComSpec ?? 'cmd.exe') : 'pnpm';
    const executableArgs = isWindows
      ? ['/d', '/s', '/c', `pnpm ${args.join(' ')}`]
      : args;
    const result = spawnSync(executable, executableArgs, {
      cwd: process.cwd(),
      env: environment,
      encoding: 'utf8',
    });

    if (result.status !== 0) {
      throw new Error(
        `No se pudo preparar la base E2E con "pnpm ${args.join(' ')}".\n` +
          `${result.stdout ?? ''}${result.stderr ?? ''}`,
      );
    }
  }
}
