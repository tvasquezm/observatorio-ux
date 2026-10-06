import { PrismaPg } from '@prisma/adapter-pg';

// PrismaPg no interpreta los parámetros de pool/schema de las URLs de Prisma 6.
export function createPrismaAdapter() {
  const connectionString = process.env.DATABASE_URL;
  let url: URL;
  try {
    url = new URL(connectionString ?? '');
  } catch {
    throw new Error('DATABASE_URL debe ser una URL de PostgreSQL válida.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL debe usar PostgreSQL.');
  }

  const max = Number(url.searchParams.get('connection_limit') ?? 10);
  const timeout = url.searchParams.get('pool_timeout') ?? '10';
  const timeoutSeconds = Number(timeout);
  if (!Number.isSafeInteger(max) || max < 1) {
    throw new Error('DATABASE_URL: connection_limit debe ser un entero positivo.');
  }
  if (!/^\d+$/.test(timeout) || !Number.isSafeInteger(timeoutSeconds) || timeoutSeconds > 2_147_483) {
    throw new Error('DATABASE_URL: pool_timeout debe estar entre 0 y 2147483 segundos.');
  }

  return new PrismaPg(
    { connectionString, max, connectionTimeoutMillis: timeoutSeconds * 1000 },
    { schema: url.searchParams.get('schema') ?? 'public' },
  );
}
