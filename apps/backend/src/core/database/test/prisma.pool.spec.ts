import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaService } from '../prisma.service.js';

describe('Pool de PostgreSQL tras migrar a Prisma 7', () => {
  it('conserva el límite, el timeout y el schema configurados en DATABASE_URL', async () => {
    const previous = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://review:review@localhost:5432/review?connection_limit=20&pool_timeout=20&schema=research';
    const prisma = new PrismaService();
    // Caracterización del límite entre Prisma y pg; connect() crea el pool
    // de forma perezosa, sin abrir conexiones ni requerir una BD real.
    const factory = (prisma as unknown as { _engineConfig: { adapter: PrismaPg } })._engineConfig.adapter;
    const adapter = await factory.connect();
    try {
      const pool = adapter.underlyingDriver();
      expect(pool.options.max).toBe(20);
      expect(pool.options.connectionTimeoutMillis).toBe(20_000);
      expect(adapter.getConnectionInfo().schemaName).toBe('research');
    } finally {
      await adapter.dispose();
      await prisma.$disconnect();
      if (previous === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previous;
    }
  });
});
