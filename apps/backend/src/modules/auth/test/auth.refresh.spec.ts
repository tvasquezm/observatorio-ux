import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { AuthService } from '../auth.service.js';
import { envValidationSchema } from '../../../core/config/env.validation.js';

describe('Renovación de sesión del evaluador', () => {
  const secret = 'evaluador-secret-solo-para-pruebas';
  const user = { id: 'u1', email: 'docente@utem.cl', nombre: 'Docente', rol: 'DOCENTE', passwordHash: bcrypt.hashSync('password123', 4) };
  const jwt = new JwtService({ secret, signOptions: { expiresIn: '1h' } });
  const config = new ConfigService({ jwt: { secret, expiresIn: '1h', maxSession: '12h', refreshWindow: '10m' }, app: { nodeEnv: 'test' } });
  let service: AuthService;
  const now = () => Math.floor(Date.now() / 1000);
  beforeEach(() => { service = new AuthService({ usuario: { findUnique: jest.fn().mockResolvedValue(user) } } as any, jwt, {} as any, config); });
  it('fuera de ventana no firma; vencido y tope absoluto rechazan', async () => {
    const sign = jest.spyOn(jwt, 'signAsync');
    const base = { ...user, actor: 'EVALUADOR' as const, rol: 'DOCENTE' as const, sessionStart: now(), exp: now() + 1800 };
    expect(await service.refresh(base)).toEqual({ renewed: false, session: { expiresAt: base.exp * 1000, refreshAt: (base.exp - 600) * 1000 } });
    expect(sign).not.toHaveBeenCalled();
    await expect(service.refresh({ ...base, exp: now() - 1 })).rejects.toMatchObject({ status: 401 });
    await expect(service.refresh({ ...base, sessionStart: now() - 43200 })).rejects.toMatchObject({ status: 401 });
    sign.mockRestore();
  });
  it('conserva sessionStart y limita exp al máximo absoluto', async () => {
    const sessionStart = now() - 43000;
    const result = await service.refresh({ ...user, actor: 'EVALUADOR', rol: 'DOCENTE', exp: now() + 100, sessionStart });
    expect(result.renewed).toBe(true);
    expect(result.session.expiresAt).toBe((sessionStart + 43200) * 1000);
    const payload = jwt.verify(result.access_token!);
    expect(payload.sessionStart).toBe(sessionStart);
    expect(payload.exp).toBe(sessionStart + 43200);
  });
  it('login entrega expiresAt y fija el inicio de sesión en el JWT', async () => {
    const result = await service.login(user.email, 'password123');
    const payload = jwt.verify(result.access_token);
    expect(result.session.expiresAt).toBe(payload.exp * 1000);
    expect(payload.sessionStart).toBe(payload.iat);
  });
  it('acota la ventana cuando el TTL es menor que la configuración', async () => {
    config.set('jwt.expiresIn', '3m');
    const result = await service.refresh({ ...user, actor: 'EVALUADOR', rol: 'DOCENTE', exp: now() + 100, sessionStart: now() });
    expect(result.renewed).toBe(false);
    config.set('jwt.expiresIn', '1h');
  });
  it('valida duraciones positivas y rechaza formatos ambiguos', () => {
    const base = { NODE_ENV: 'test', DATABASE_URL: 'postgres://test', JWT_SECRET: secret, JWT_PARTICIPANTE_SECRET: secret + '-otro' };
    expect(envValidationSchema.validate({ ...base, JWT_MAX_SESSION: '0h' }).error).toBeDefined();
    expect(envValidationSchema.validate({ ...base, JWT_REFRESH_WINDOW: '10' }).error).toBeDefined();
    expect(envValidationSchema.validate(base).value.JWT_MAX_SESSION).toBe('12h');
  });
});
