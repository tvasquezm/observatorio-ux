// Pruebas unitarias — AuthService.registerParticipant.
// Requisito del cliente: "solo los de la lista pueden crearse una
// cuenta". Estas pruebas fijan que un email fuera de la whitelist del
// proyecto sea rechazado, y que el registro sea idempotente.

import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { ParticipanteJwtService } from '../participante-jwt.service';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';

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
    proyecto: {
      findUnique: jest.Mock;
    };
  };

  const PROYECTO_ID = 'proyecto-1';
  const EMAIL_AUTORIZADO = 'estudiante.autorizado@utem.cl';
  const EMAIL_NO_AUTORIZADO = 'intruso@gmail.com';
  const CODIGO_INVITACION = 'codigo-seguro-de-prueba-123';
  const CODIGO_HASH = createHash('sha256').update(CODIGO_INVITACION).digest('hex');

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
      proyecto: {
        findUnique: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: ParticipanteJwtService, useValue: { sign: jest.fn(), verify: jest.fn() } },
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
      codigoInvitacionHash: CODIGO_HASH,
    });
    prisma.participante.create.mockResolvedValue({ id: 'participante-nuevo' });
    prisma.participanteWhitelist.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.registerParticipant(
      PROYECTO_ID,
      EMAIL_AUTORIZADO,
      undefined,
      CODIGO_INVITACION,
    );

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
      codigoInvitacionHash: CODIGO_HASH,
    });

    const result = await service.registerParticipant(
      PROYECTO_ID,
      EMAIL_AUTORIZADO,
      undefined,
      CODIGO_INVITACION,
    );

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
        codigoInvitacionHash: CODIGO_HASH,
      })
      .mockResolvedValueOnce({
        id: 'entry-1',
        proyectoId: PROYECTO_ID,
        email: EMAIL_AUTORIZADO,
        usado: true,
        participanteId: 'participante-ganador',
        codigoInvitacionHash: CODIGO_HASH,
      });
    prisma.participante.create.mockResolvedValue({ id: 'participante-perdedor' });
    prisma.participanteWhitelist.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.registerParticipant(PROYECTO_ID, EMAIL_AUTORIZADO, undefined, CODIGO_INVITACION),
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
    prisma.proyecto.findUnique.mockResolvedValue({ id: PROYECTO_ID, deletedAt: null });
    prisma.participanteWhitelist.findFirst.mockResolvedValue({
      id: 'entry-1',
      usado: true,
      participanteId: 'participante-1',
      codigoInvitacionHash: CODIGO_HASH,
    });
    prisma.consentimiento.findFirst.mockResolvedValue(null);
    prisma.consentimiento.create.mockResolvedValue({ id: 'consent-1' });

    await expect(
      service.registerParticipantConsent(
        'participante-1',
        PROYECTO_ID,
        true,
        '1.0',
        CODIGO_INVITACION,
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

  it('registra consentimiento sin whitelist para un participante de acceso abierto con resumeToken válido (Fase 1 + H4)', async () => {
    const resumeToken = 'resume-token-seguro-con-mas-de-32-caracteres';
    const resumeTokenHash = createHash('sha256').update(resumeToken).digest('hex');
    prisma.participante.findUnique.mockResolvedValue({
      id: 'participante-anonimo',
      resumeTokenHash,
    });
    prisma.proyecto.findUnique.mockResolvedValue({ id: PROYECTO_ID, deletedAt: null });
    prisma.participanteWhitelist.findFirst.mockResolvedValue(null);
    prisma.consentimiento.findFirst.mockResolvedValue(null);
    prisma.consentimiento.create.mockResolvedValue({ id: 'consent-abierto' });

    await expect(
      service.registerParticipantConsent(
        'participante-anonimo',
        PROYECTO_ID,
        true,
        '1.0',
        undefined,
        resumeToken,
      ),
    ).resolves.toEqual({ id: 'consent-abierto' });

    expect(prisma.consentimiento.create).toHaveBeenCalledWith({
      data: {
        participanteId: 'participante-anonimo',
        proyectoId: PROYECTO_ID,
        aceptado: true,
        version: '1.0',
      },
    });
  });

  it('H4: rechaza registrar consentimiento de acceso abierto sin resumeToken', async () => {
    prisma.participante.findUnique.mockResolvedValue({
      id: 'participante-anonimo',
      resumeTokenHash: createHash('sha256').update('otro-token-valido-de-32-caracteres').digest('hex'),
    });
    prisma.proyecto.findUnique.mockResolvedValue({ id: PROYECTO_ID, deletedAt: null });
    prisma.participanteWhitelist.findFirst.mockResolvedValue(null);

    await expect(
      service.registerParticipantConsent('participante-anonimo', PROYECTO_ID, true, '1.0'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.consentimiento.create).not.toHaveBeenCalled();
  });

  it('H4: rechaza registrar consentimiento de acceso abierto con resumeToken incorrecto', async () => {
    prisma.participante.findUnique.mockResolvedValue({
      id: 'participante-anonimo',
      resumeTokenHash: createHash('sha256').update('token-correcto-de-32-caracteres-o-mas').digest('hex'),
    });
    prisma.proyecto.findUnique.mockResolvedValue({ id: PROYECTO_ID, deletedAt: null });
    prisma.participanteWhitelist.findFirst.mockResolvedValue(null);

    await expect(
      service.registerParticipantConsent(
        'participante-anonimo',
        PROYECTO_ID,
        true,
        '1.0',
        undefined,
        'token-incorrecto-de-32-caracteres-o-mas',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.consentimiento.create).not.toHaveBeenCalled();
  });

  it('rechaza registrar consentimiento si el proyecto no existe', async () => {
    prisma.participante.findUnique.mockResolvedValue({ id: 'participante-1' });
    prisma.proyecto.findUnique.mockResolvedValue(null);

    await expect(
      service.registerParticipantConsent('participante-1', PROYECTO_ID, true, '1.0'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza emitir token si el participante no está en la whitelist', async () => {
    prisma.participante.findUnique.mockResolvedValue({ id: 'participante-1' });
    prisma.participanteWhitelist.findFirst.mockResolvedValue(null);

    await expect(
      service.issueParticipantToken('participante-1', PROYECTO_ID, CODIGO_INVITACION),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.consentimiento.findFirst).not.toHaveBeenCalled();
  });

  it('respeta el último consentimiento y no reactiva uno antiguo', async () => {
    prisma.participante.findUnique.mockResolvedValue({ id: 'participante-1' });
    prisma.participanteWhitelist.findFirst.mockResolvedValue({
      id: 'entry-1',
      usado: true,
      participanteId: 'participante-1',
      codigoInvitacionHash: CODIGO_HASH,
    });
    prisma.consentimiento.findFirst.mockResolvedValue({
      id: 'consent-2',
      aceptado: false,
    });

    await expect(
      service.issueParticipantToken('participante-1', PROYECTO_ID, CODIGO_INVITACION),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza reclamar una invitación con un código incorrecto', async () => {
    prisma.participanteWhitelist.findUnique.mockResolvedValue({
      id: 'entry-1',
      proyectoId: PROYECTO_ID,
      email: EMAIL_AUTORIZADO,
      usado: false,
      participanteId: null,
      codigoInvitacionHash: CODIGO_HASH,
    });

    await expect(
      service.registerParticipant(PROYECTO_ID, EMAIL_AUTORIZADO, undefined, 'codigo-incorrecto-largo'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.participante.create).not.toHaveBeenCalled();
  });
});

// Fase 1 (PLAN_AJUSTES.md): acceso público sin whitelist ni datos
// personales. Decisión del usuario: 100% abierto por link/QR.
describe('AuthService.accessParticipant', () => {
  let service: AuthService;
  let prisma: {
    proyecto: { findUnique: jest.Mock };
    participante: { create: jest.Mock };
  };
  let participanteJwt: { sign: jest.Mock };

  const PROYECTO_ID = 'proyecto-1';

  beforeEach(async () => {
    prisma = {
      proyecto: { findUnique: jest.fn() },
      participante: { create: jest.fn() },
    };
    participanteJwt = { sign: jest.fn().mockResolvedValue('token-firmado') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: ParticipanteJwtService, useValue: participanteJwt },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('rechaza el acceso si el proyecto no existe', async () => {
    prisma.proyecto.findUnique.mockResolvedValue(null);

    await expect(service.accessParticipant(PROYECTO_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.participante.create).not.toHaveBeenCalled();
  });

  it('rechaza el acceso si el proyecto está soft-deleted', async () => {
    prisma.proyecto.findUnique.mockResolvedValue({ id: PROYECTO_ID, deletedAt: new Date() });

    await expect(service.accessParticipant(PROYECTO_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.participante.create).not.toHaveBeenCalled();
  });

  it('crea un participante SIN datos personales y devuelve el token de sesión', async () => {
    prisma.proyecto.findUnique.mockResolvedValue({ id: PROYECTO_ID, deletedAt: null });
    prisma.participante.create.mockResolvedValue({ id: 'participante-anonimo' });

    const result = await service.accessParticipant(PROYECTO_ID);

    expect(prisma.participante.create).toHaveBeenCalledWith({
      data: { resumeTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) },
    });
    expect(participanteJwt.sign).toHaveBeenCalledWith({
      sub: 'participante-anonimo',
      actor: 'PARTICIPANTE',
      rol: 'PARTICIPANTE',
      proyectoId: PROYECTO_ID,
    });
    expect(result).toEqual({
      access_token: 'token-firmado',
      resume_token: expect.any(String),
      participant: { id: 'participante-anonimo', proyectoId: PROYECTO_ID },
    });
    expect(result.resume_token).toHaveLength(43);
  });
});

describe('AuthService reanuda un participante anónimo', () => {
  const PROYECTO_ID = 'proyecto-1';
  const PARTICIPANTE_ID = 'participante-1';
  const RESUME_TOKEN = 'resume-token-seguro-con-mas-de-32-caracteres';
  const RESUME_HASH = createHash('sha256').update(RESUME_TOKEN).digest('hex');
  let service: AuthService;
  let prisma: {
    participante: { findUnique: jest.Mock };
    participanteWhitelist: { findFirst: jest.Mock };
    consentimiento: { findFirst: jest.Mock };
  };
  let participanteJwt: { sign: jest.Mock };

  beforeEach(async () => {
    prisma = {
      participante: { findUnique: jest.fn() },
      participanteWhitelist: { findFirst: jest.fn() },
      consentimiento: { findFirst: jest.fn() },
    };
    participanteJwt = { sign: jest.fn().mockResolvedValue('token-renovado') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: ParticipanteJwtService, useValue: participanteJwt },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    prisma.participante.findUnique.mockResolvedValue({
      id: PARTICIPANTE_ID,
      resumeTokenHash: RESUME_HASH,
    });
    prisma.participanteWhitelist.findFirst.mockResolvedValue(null);
    prisma.consentimiento.findFirst.mockResolvedValue({ aceptado: true });
  });

  it('renueva el Bearer conservando la misma identidad', async () => {
    await expect(
      service.issueParticipantToken(
        PARTICIPANTE_ID,
        PROYECTO_ID,
        undefined,
        false,
        RESUME_TOKEN,
      ),
    ).resolves.toEqual({
      access_token: 'token-renovado',
      resume_token: RESUME_TOKEN,
      participant: { id: PARTICIPANTE_ID, proyectoId: PROYECTO_ID },
    });
  });

  it('rechaza un secreto de reanudación incorrecto', async () => {
    await expect(
      service.issueParticipantToken(
        PARTICIPANTE_ID,
        PROYECTO_ID,
        undefined,
        false,
        'resume-token-incorrecto-con-mas-de-32-caracteres',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.consentimiento.findFirst).not.toHaveBeenCalled();
  });
});

// H6: timing/normalización de login.
describe('AuthService.login', () => {
  let service: AuthService;
  let prisma: { usuario: { findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = { usuario: { findUnique: jest.fn() } };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('jwt-evaluador') } },
        { provide: ParticipanteJwtService, useValue: { sign: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('normaliza el email (mayúsculas/espacios) antes de buscarlo', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await expect(
      service.login('  Usuario@UX.utem.CL  ', 'cualquier-cosa'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { email: 'usuario@ux.utem.cl' },
    });
  });

  it('H6: corre bcrypt.compare aunque el usuario no exista (mismo costo de timing)', async () => {
    const compareSpy = jest.spyOn(bcrypt, 'compare');
    prisma.usuario.findUnique.mockResolvedValue(null);

    await expect(
      service.login('no-existe@ux.utem.cl', 'cualquier-cosa'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(compareSpy).toHaveBeenCalledTimes(1);
    compareSpy.mockRestore();
  });

  it('rechaza contraseña incorrecta para un usuario que sí existe', async () => {
    const passwordHash = await bcrypt.hash('la-correcta-1234', 10);
    prisma.usuario.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'docente@ux.utem.cl',
      passwordHash,
      rol: 'DOCENTE',
    });

    await expect(
      service.login('docente@ux.utem.cl', 'incorrecta'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('acepta la contraseña correcta y devuelve el token', async () => {
    const passwordHash = await bcrypt.hash('la-correcta-1234', 10);
    prisma.usuario.findUnique.mockResolvedValue({
      id: 'user-1',
      nombre: 'Docente Uno',
      email: 'docente@ux.utem.cl',
      passwordHash,
      rol: 'DOCENTE',
    });

    await expect(service.login('docente@ux.utem.cl', 'la-correcta-1234')).resolves.toEqual({
      access_token: 'jwt-evaluador',
      user: {
        id: 'user-1',
        nombre: 'Docente Uno',
        email: 'docente@ux.utem.cl',
        rol: 'DOCENTE',
      },
    });
  });
});

// H2: los endpoints de token de prueba solo deben funcionar en desarrollo.
describe('AuthService — gating de tokens de prueba (H2)', () => {
  let prisma: {
    usuario: { findFirst: jest.Mock };
    consentimiento: { findFirst: jest.Mock };
    participante: { findUnique: jest.Mock };
    participanteWhitelist: { findFirst: jest.Mock };
  };
  let config: { get: jest.Mock };

  const buildService = async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('jwt-evaluador') } },
        { provide: ParticipanteJwtService, useValue: { sign: jest.fn().mockResolvedValue('jwt-participante') } },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    return moduleRef.get<AuthService>(AuthService);
  };

  beforeEach(() => {
    prisma = {
      usuario: { findFirst: jest.fn().mockResolvedValue({ id: 'user-1', email: 'a@ux.utem.cl', rol: 'ADMIN' }) },
      consentimiento: {
        findFirst: jest.fn().mockResolvedValue({
          participanteId: 'participante-1',
          proyectoId: 'proyecto-1',
          aceptado: true,
        }),
      },
      participante: { findUnique: jest.fn().mockResolvedValue({ id: 'participante-1' }) },
      participanteWhitelist: { findFirst: jest.fn().mockResolvedValue(null) },
    };
  });

  it.each(['production', 'test', undefined])(
    'rechaza test-token y test-participant-token cuando NODE_ENV=%s',
    async (nodeEnv) => {
      config = { get: jest.fn().mockReturnValue(nodeEnv) };
      const service = await buildService();

      await expect(service.issueDevelopmentEvaluatorToken()).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.issueDevelopmentParticipantToken()).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it('permite test-token y test-participant-token solo cuando NODE_ENV=development', async () => {
    config = { get: jest.fn().mockReturnValue('development') };
    const service = await buildService();

    await expect(service.issueDevelopmentEvaluatorToken()).resolves.toBeDefined();
    await expect(service.issueDevelopmentParticipantToken()).resolves.toBeDefined();
  });
});
