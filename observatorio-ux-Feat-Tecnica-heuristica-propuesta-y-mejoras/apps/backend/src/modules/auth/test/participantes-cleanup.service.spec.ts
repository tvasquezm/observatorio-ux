// H5 (Fase 7, PLAN_REMEDIACION_AUDITORIA.md): la limpieza horaria nunca
// debe tocar un participante con consentimiento o sesión real — estos
// tests fijan ese contrato en el `where` real que se manda a Prisma.

import { Test } from '@nestjs/testing';
import { ParticipantesCleanupService } from '../participantes-cleanup.service.js';
import { PrismaService } from '../../../core/database/prisma.service.js';

describe('ParticipantesCleanupService.limpiarHuerfanos', () => {
  let service: ParticipantesCleanupService;
  let prisma: { participante: { deleteMany: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      participante: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ParticipantesCleanupService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ParticipantesCleanupService);
  });

  it('borra solo participantes anónimos sin consentimientos ni sesiones y con más de 1h', async () => {
    await service.limpiarHuerfanos();

    expect(prisma.participante.deleteMany).toHaveBeenCalledWith({
      where: {
        createdAt: { lt: expect.any(Date) },
        proyectoId: { not: null },
        consentimientos: { none: {} },
        sesiones: { none: {} },
      },
    });
  });

  it('no lanza si no hay huérfanos que borrar', async () => {
    prisma.participante.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.limpiarHuerfanos()).resolves.toBeUndefined();
  });
});
