import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthService } from '../auth.service';
import { ParticipanteJwtService } from '../participante-jwt.service';

describe('AuthService.validateTokenPayload — cache de identidad', () => {
  let service: AuthService;
  let prisma: {
    usuario: { findUnique: jest.Mock };
    participante: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      usuario: { findUnique: jest.fn() },
      participante: { findUnique: jest.fn() },
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

  it('consulta la base una sola vez por evaluador y reutiliza la identidad', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: 'u1', email: 'a@x.cl', rol: 'DOCENTE' });

    const primera = await service.validateTokenPayload({ sub: 'u1' });
    const segunda = await service.validateTokenPayload({ sub: 'u1' });

    expect(prisma.usuario.findUnique).toHaveBeenCalledTimes(1);
    expect(segunda).toEqual(primera);
    expect(primera).toEqual({ id: 'u1', email: 'a@x.cl', rol: 'DOCENTE', actor: 'EVALUADOR' });
  });

  it('un cambio de rol invalidado se ve en la siguiente validación', async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce({ id: 'u1', email: 'a@x.cl', rol: 'DOCENTE' })
      .mockResolvedValueOnce({ id: 'u1', email: 'a@x.cl', rol: 'ESTUDIANTE' });

    await service.validateTokenPayload({ sub: 'u1' });
    service.invalidateUser('u1');
    const despues = await service.validateTokenPayload({ sub: 'u1' });

    expect(despues.rol).toBe('ESTUDIANTE');
    expect(prisma.usuario.findUnique).toHaveBeenCalledTimes(2);
  });

  it('un usuario eliminado e invalidado vuelve a recibir 401', async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce({ id: 'u1', email: 'a@x.cl', rol: 'DOCENTE' })
      .mockResolvedValueOnce(null);

    await service.validateTokenPayload({ sub: 'u1' });
    service.invalidateUser('u1');

    await expect(service.validateTokenPayload({ sub: 'u1' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it.each([
    { cambio: 'rol', usuario: { id: 'u1', email: 'a@x.cl', rol: 'ESTUDIANTE' } },
    { cambio: 'borrado', usuario: null },
  ])('no repuebla la identidad invalidada durante una lectura ($cambio)', async ({ usuario }) => {
    const identidadAnterior = { id: 'u1', email: 'a@x.cl', rol: 'ADMIN' };
    let completarLectura!: (value: typeof identidadAnterior) => void;
    prisma.usuario.findUnique
      .mockImplementationOnce(() => new Promise<typeof identidadAnterior>((resolve) => {
        completarLectura = resolve;
      }))
      .mockResolvedValueOnce(usuario);

    const enCurso = service.validateTokenPayload({ sub: 'u1' });
    service.invalidateUser('u1');
    completarLectura(identidadAnterior);
    await enCurso;

    const siguiente = service.validateTokenPayload({ sub: 'u1' });
    if (usuario) {
      await expect(siguiente).resolves.toMatchObject(usuario);
    } else {
      await expect(siguiente).rejects.toBeInstanceOf(UnauthorizedException);
    }
    expect(prisma.usuario.findUnique).toHaveBeenCalledTimes(2);
  });

  it('no cachea los usuarios inexistentes', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await expect(service.validateTokenPayload({ sub: 'fantasma' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.validateTokenPayload({ sub: 'fantasma' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(prisma.usuario.findUnique).toHaveBeenCalledTimes(2);
  });

  it('cachea al participante pero toma el proyecto siempre del token', async () => {
    prisma.participante.findUnique.mockResolvedValue({ id: 'p1' });

    const a = await service.validateTokenPayload({
      sub: 'p1',
      actor: 'PARTICIPANTE',
      proyectoId: 'proy-A',
    });
    const b = await service.validateTokenPayload({
      sub: 'p1',
      actor: 'PARTICIPANTE',
      proyectoId: 'proy-B',
    });

    expect(prisma.participante.findUnique).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ id: 'p1', rol: 'PARTICIPANTE', actor: 'PARTICIPANTE', proyectoId: 'proy-A' });
    expect(b.proyectoId).toBe('proy-B');
  });

  it('un id de evaluador cacheado no autentica a un participante con el mismo id', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: 'x1', email: 'a@x.cl', rol: 'ADMIN' });
    prisma.participante.findUnique.mockResolvedValue(null);

    await service.validateTokenPayload({ sub: 'x1' });

    await expect(
      service.validateTokenPayload({ sub: 'x1', actor: 'PARTICIPANTE' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
