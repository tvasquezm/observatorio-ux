import { createPrismaAdapter } from './adapter.js';

describe('Prisma 7: configuración de PostgreSQL', () => {
  const originalUrl = process.env.DATABASE_URL;
  afterEach(() => {
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
  });

  it('conserva límites y schema de DATABASE_URL', async () => {
    process.env.DATABASE_URL =
      'postgresql://test:test@localhost/test?schema=research&connection_limit=20&pool_timeout=20';
    const connection = await createPrismaAdapter().connect();
    try {
      expect(connection.underlyingDriver().options.max).toBe(20);
      expect(connection.underlyingDriver().options.connectionTimeoutMillis).toBe(20_000);
      expect(connection.getConnectionInfo().schemaName).toBe('research');
    } finally {
      await connection.dispose();
    }
  });

  it('mantiene una espera acotada cuando no se configura el pool', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
    const connection = await createPrismaAdapter().connect();
    try {
      expect(connection.underlyingDriver().options.max).toBe(10);
      expect(connection.underlyingDriver().options.connectionTimeoutMillis).toBe(10_000);
      expect(connection.getConnectionInfo().schemaName).toBe('public');
    } finally {
      await connection.dispose();
    }
  });

  it('permite deshabilitar el timeout explícitamente', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost/test?pool_timeout=0';
    const connection = await createPrismaAdapter().connect();
    try {
      expect(connection.underlyingDriver().options.connectionTimeoutMillis).toBe(0);
    } finally {
      await connection.dispose();
    }
  });

  it.each([
    undefined, '', 'invalid-secret-url', 'https://localhost/test',
    'postgresql://test:test@localhost/test?connection_limit=0',
    'postgresql://test:test@localhost/test?connection_limit=1.5',
    'postgresql://test:test@localhost/test?pool_timeout=invalid',
    'postgresql://test:test@localhost/test?pool_timeout=',
    'postgresql://test:test@localhost/test?pool_timeout=-1',
    'postgresql://test:test@localhost/test?pool_timeout=2147484',
  ])('rechaza configuración inválida sin imprimir credenciales (%s)', (url) => {
    if (url === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = url;
    expect(createPrismaAdapter).toThrow(/DATABASE_URL/);
    try {
      createPrismaAdapter();
    } catch (error) {
      expect(String(error)).not.toContain('invalid-secret-url');
    }
  });
});
