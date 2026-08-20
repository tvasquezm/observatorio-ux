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
    $transaction: jest.Mock;
    participanteWhitelist: {
      findUnique: jest.Mock;
      updateMany: jest.Mock;
      findFirst: jest.Mock;
    };
    participante: {
      create: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
    };
    consentimiento: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  const PROYECTO_ID = 'proyecto-1';
  const EMAIL_AUTORIZADO = 'estudiante.autorizado@utem.cl';
  const EMAIL_NO_AUTORIZADO = 'intruso@gmail.com';

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((callback) => callback(prisma)),
      participanteWhitelist: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
      },
      participante: {
        create: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
      consentimiento: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
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
    prisma.participanteWhitelist.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.registerParticipant(PROYECTO_ID, EMAIL_AUTORIZADO);

    expect(result).toEqual({ participanteId: 'participante-nuevo', yaRegistrado: false });
    expect(prisma.participanteWhitelist.updateMany).toHaveBeenCalledWith({
      where: { id: 'entry-1', participanteId: null },
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

  it('recupera el participante ganador si otra solicitud reclamó la whitelist antes', async () => {
    prisma.participanteWhitelist.findUnique
      .mockResolvedValueOnce({
        id: 'entry-1',
        proyectoId: PROYECTO_ID,
        email: EMAIL_AUTORIZADO,
        usado: false,
        participanteId: null,
      })
      .mockResolvedValueOnce({
        id: 'entry-1',
        proyectoId: PROYECTO_ID,
        email: EMAIL_AUTORIZADO,
        usado: true,
        participanteId: 'participante-ganador',
      });
    prisma.participante.create.mockResolvedValue({ id: 'participante-perdedor' });
    prisma.participanteWhitelist.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.registerParticipant(PROYECTO_ID, EMAIL_AUTORIZADO),
    ).resolves.toEqual({
      participanteId: 'participante-ganador',
      yaRegistrado: true,
    });
    expect(prisma.participante.delete).toHaveBeenCalledWith({
      where: { id: 'participante-perdedor' },
    });
  });

  it('registra consentimiento solo para un participante autorizado', async () => {
    prisma.participante.findUnique.mockResolvedValue({ id: 'participante-1' });
    prisma.participanteWhitelist.findFirst.mockResolvedValue({
      id: 'entry-1',
      usado: true,
      participanteId: 'participante-1',
    });
    prisma.consentimiento.findFirst.mockResolvedValue(null);
    prisma.consentimiento.create.mockResolvedValue({ id: 'consent-1' });

    await expect(
      service.registerParticipantConsent(
        'participante-1',
        PROYECTO_ID,
        true,
        '1.0',
      ),
    ).resolves.toEqual({ id: 'consent-1' });

    expect(prisma.consentimiento.create).toHaveBeenCalledWith({
      data: {
        participanteId: 'participante-1',
        proyectoId: PROYECTO_ID,
        aceptado: true,
        version: '1.0',
      },
    });
  });

  it('rechaza emitir token si el participante no está en la whitelist', async () => {
    prisma.participante.findUnique.mockResolvedValue({ id: 'participante-1' });
    prisma.participanteWhitelist.findFirst.mockResolvedValue(null);

    await expect(
      service.issueParticipantToken('participante-1', PROYECTO_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.consentimiento.findFirst).not.toHaveBeenCalled();
  });

  it('respeta el último consentimiento y no reactiva uno antiguo', async () => {
    prisma.participante.findUnique.mockResolvedValue({ id: 'participante-1' });
    prisma.participanteWhitelist.findFirst.mockResolvedValue({
      id: 'entry-1',
      usado: true,
      participanteId: 'participante-1',
    });
    prisma.consentimiento.findFirst.mockResolvedValue({
      id: 'consent-2',
      aceptado: false,
    });

    await expect(
      service.issueParticipantToken('participante-1', PROYECTO_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
