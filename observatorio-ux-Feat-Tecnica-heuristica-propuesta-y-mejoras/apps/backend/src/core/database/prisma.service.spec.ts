import { jest } from '@jest/globals';
import { PrismaService } from './prisma.service.js';

it('impide el arranque si PostgreSQL no responde', async () => {
  const originalUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
  const prisma = new PrismaService();
  jest.spyOn(prisma, '$queryRaw').mockRejectedValue(new Error('database unavailable'));
  try {
    await expect(prisma.onModuleInit()).rejects.toThrow('database unavailable');
  } finally {
    await prisma.$disconnect();
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
  }
});
