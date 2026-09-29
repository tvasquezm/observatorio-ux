// Pruebas unitarias — login de EVALUADOR con Google
// (AuthService.loginOrCreateFromGoogle + GoogleStrategy.validate).

import { Test } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { GoogleOauthGuard } from '../google-oauth.guard';
import { GoogleStrategy } from '../google.strategy';
import { PrismaService } from '../../../core/database/prisma.service';
import { ParticipanteJwtService } from '../participante-jwt.service';

describe('AuthService.loginOrCreateFromGoogle', () => {
  let service: AuthService;
  let jwt: { signAsync: jest.Mock };
  let prisma: {
    usuario: { findUnique: jest.Mock; create: jest.Mock };
    salaEstudiante: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      usuario: { findUnique: jest.fn(), create: jest.fn() },
      salaEstudiante: { findFirst: jest.fn() },
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('jwt-evaluador') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ParticipanteJwtService, useValue: { sign: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('usuario existente DOCENTE: entra sin exigir sala y sin tocar el rol', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 'u1',
      nombre: 'Docente',
      email: 'docente@utem.cl',
      rol: 'DOCENTE',
    });

    const result = await service.loginOrCreateFromGoogle('  Docente@UTEM.cl ', 'Otro Nombre');

    expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { email: 'docente@utem.cl' },
    });
    expect(prisma.salaEstudiante.findFirst).not.toHaveBeenCalled();
    expect(prisma.usuario.create).not.toHaveBeenCalled();
    expect(result.access_token).toBe('jwt-evaluador');
    expect(result.user.rol).toBe('DOCENTE');
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'u1', rol: 'DOCENTE', actor: 'EVALUADOR' }),
    );
  });

  it('usuario existente ESTUDIANTE sin sala activa: 403', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 'u2',
      email: 'est@utem.cl',
      rol: 'ESTUDIANTE',
    });
    prisma.salaEstudiante.findFirst.mockResolvedValue(null);

    await expect(service.loginOrCreateFromGoogle('est@utem.cl')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('email sin usuario y sin sala activa: 403 y NO crea la cuenta', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);
    prisma.salaEstudiante.findFirst.mockResolvedValue(null);

    await expect(service.loginOrCreateFromGoogle('intruso@gmail.com')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.usuario.create).not.toHaveBeenCalled();
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('email sin usuario pero inscrito en sala activa: crea ESTUDIANTE sin passwordHash', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);
    prisma.salaEstudiante.findFirst.mockResolvedValue({ nombre: 'Ana Pérez' });
    prisma.usuario.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'nuevo', ...data }),
    );

    const result = await service.loginOrCreateFromGoogle('Ana@utem.cl', 'Ana G.');

    const { data } = prisma.usuario.create.mock.calls[0][0];
    expect(data).toEqual({ email: 'ana@utem.cl', nombre: 'Ana Pérez', rol: 'ESTUDIANTE' });
    expect(data).not.toHaveProperty('passwordHash');
    expect(result.user.rol).toBe('ESTUDIANTE');
  });

  it('nunca crea DOCENTE/ADMIN: el rol de la cuenta nueva es siempre ESTUDIANTE', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);
    prisma.salaEstudiante.findFirst.mockResolvedValue({ nombre: null });
    prisma.usuario.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'nuevo', ...data }),
    );

    await service.loginOrCreateFromGoogle('admin@utem.cl', 'Admin');

    expect(prisma.usuario.create.mock.calls[0][0].data.rol).toBe('ESTUDIANTE');
  });

  it('carrera P2002 al crear: reutiliza el usuario ya creado', async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'u9', nombre: 'Ana', email: 'ana@utem.cl', rol: 'ESTUDIANTE' });
    prisma.salaEstudiante.findFirst.mockResolvedValue({ nombre: 'Ana' });
    prisma.usuario.create.mockRejectedValue({ code: 'P2002' });

    const result = await service.loginOrCreateFromGoogle('ana@utem.cl');

    expect(result.user.id).toBe('u9');
  });
});

describe('GoogleStrategy.validate', () => {
  const config = {
    getOrThrow: (key: string) => `valor-${key}`,
  } as unknown as ConfigService;
  const strategy = new GoogleStrategy(config);
  const validate = (profile: unknown) => {
    const done = jest.fn();
    strategy.validate('at', 'rt', profile as never, done);
    return done;
  };

  it('acepta un email verificado y entrega {email, nombre}', () => {
    const done = validate({
      displayName: 'Ana',
      emails: [{ value: 'ana@utem.cl', verified: true }],
    });
    expect(done).toHaveBeenCalledWith(null, { email: 'ana@utem.cl', nombre: 'Ana' });
  });

  it('acepta email verificado según _json.email_verified', () => {
    const done = validate({
      displayName: 'Ana',
      emails: [{ value: 'ana@utem.cl' }],
      _json: { email_verified: true },
    });
    expect(done).toHaveBeenCalledWith(null, { email: 'ana@utem.cl', nombre: 'Ana' });
  });

  it('rechaza un email no verificado', () => {
    const done = validate({
      displayName: 'X',
      emails: [{ value: 'x@utem.cl', verified: false }],
    });
    expect(done).toHaveBeenCalledWith(expect.any(Error), undefined);
  });

  it('rechaza si Google no informa el estado de verificación', () => {
    const done = validate({ displayName: 'X', emails: [{ value: 'x@utem.cl' }] });
    expect(done).toHaveBeenCalledWith(expect.any(Error), undefined);
  });

  it('rechaza si no hay email', () => {
    const done = validate({ displayName: 'X', emails: [] });
    expect(done).toHaveBeenCalledWith(expect.any(Error), undefined);
  });
});

describe('GoogleOauthGuard', () => {
  it('sin GOOGLE_* configurado: redirige a /login?error=google_no_disponible y bloquea', async () => {
    const config = {
      get: jest.fn().mockReturnValue(undefined),
      getOrThrow: jest.fn().mockReturnValue('http://localhost:5173/'),
    } as unknown as ConfigService;
    const guard = new GoogleOauthGuard(config);
    const res = { redirect: jest.fn() };
    const context = {
      switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({}) }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(false);
    expect(res.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/login?error=google_no_disponible',
    );
  });
});
