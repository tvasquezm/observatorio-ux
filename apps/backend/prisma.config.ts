import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Migraciones: conexión directa si existe (DIRECT_URL), p. ej. Neon sin
    // pooler. La API sigue usando DATABASE_URL vía prisma/adapter.ts.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  },
});