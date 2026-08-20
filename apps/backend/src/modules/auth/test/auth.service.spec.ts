// Pruebas unitarias — AuthService.registerParticipant.
// Requisito del cliente: "solo los de la lista pueden crearse una
// cuenta". Estas pruebas fijan que un email fuera de la whitelist del
// proyecto sea rechazado, y que el registro sea idempotente.

import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../core/database/prisma.service';

describe('AuthService.registerParticipant', () => {
  let service: AuthService;
  let prisma: {
    participanteWhitelist: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    participante: {
      create: jest.Mock;
    };
  };

  const PROYECTO_ID = 'proyecto-1';
  const EMAIL_AUTORIZADO = 'estudiante.autorizado@utem.cl';
  const EMAIL_NO_AUTORIZADO = 'intruso@gmail.com';

  beforeEach(async () => {
    prisma = {
      participanteWhitelist: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      participante: {
        create: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('RECHAZA el registro si el email no está en la whitelist del proyecto', async () => {
    prisma.participanteWhitelist.findUnique.mockResolvedValue(null);

    await expect(
      service.registerParticipant(PROYECTO_ID, EMAIL_NO_AUTORIZADO),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.participante.create).not.toHaveBeenCalled();
  });

  it('PERMITE el registro si el email está en la whitelist y aún no fue usado', async () => {
    prisma.participanteWhitelist.findUnique.mockResolvedValue({
      id: 'entry-1',
      proyectoId: PROYECTO_ID,
      email: EMAIL_AUTORIZADO,
      usado: false,
      participanteId: null,
    });
    prisma.participante.create.mockResolvedValue({ id: 'participante-nuevo' });
    prisma.participanteWhitelist.update.mockResolvedValue({});

    const result = await service.registerParticipant(PROYECTO_ID, EMAIL_AUTORIZADO);

    expect(result).toEqual({ participanteId: 'participante-nuevo', yaRegistrado: false });
    expect(prisma.participanteWhitelist.update).toHaveBeenCalledWith({
      where: { id: 'entry-1' },
      data: { usado: true, participanteId: 'participante-nuevo' },
    });
  });

  it('es idempotente: si ya se había registrado, devuelve el mismo participanteId sin crear otro', async () => {
    prisma.participanteWhitelist.findUnique.mockResolvedValue({
      id: 'entry-1',
      proyectoId: PROYECTO_ID,
      email: EMAIL_AUTORIZADO,
      usado: true,
      participanteId: 'participante-existente',
    });

    const result = await service.registerParticipant(PROYECTO_ID, EMAIL_AUTORIZADO);

    expect(result).toEqual({ participanteId: 'participante-existente', yaRegistrado: true });
    expect(prisma.participante.create).not.toHaveBeenCalled();
  });

  it('normaliza el email (mayúsculas/espacios) antes de buscarlo en la whitelist', async () => {
    prisma.participanteWhitelist.findUnique.mockResolvedValue(null);

    await expect(
      service.registerParticipant(PROYECTO_ID, '  Estudiante.Autorizado@UTEM.cl  '),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.participanteWhitelist.findUnique).toHaveBeenCalledWith({
      where: {
        proyectoId_email: {
          proyectoId: PROYECTO_ID,
          email: 'estudiante.autorizado@utem.cl',
        },
      },
    });
  });
});