import { Injectable, OnModuleInit } from '@nestjs/common';
import { createPrismaAdapter } from '../../../prisma/adapter.js';
import { PrismaClient } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({ adapter: createPrismaAdapter() });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    // El pool de pg conecta de forma diferida: $connect() no verifica el servidor.
    await this.$queryRaw`SELECT 1`;
  }
}
