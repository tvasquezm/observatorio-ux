import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service.js';

const secret = 'secreto-de-pruebas';

function crear() {
  const prisma = {
    usuario: {
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    participante: { findUnique: jest.fn() },
  };
  const jwt = new JwtService({ secret });
  const config = new ConfigService({ jwt: { secret, expiresIn: '1h', maxSession: '12h', refreshWindow: '10m' } });
  const service = new AuthService(prisma as any, jwt, {} as any, config as any);
  return { service, prisma, jwt };
}

describe('versión de sesión (revocación)', () => {
  it('rechaza un token con una versión anterior a la del usuario', async () => {
    const { service, prisma } = crear();
    prisma.usuario.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.cl', rol: 'DOCENTE', sesionVersion: 2 });

    await expect(service.validateTokenPayload({ sub: 'u1', sv: 1 })).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.validateTokenPayload({ sub: 'u1' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('acepta la versión vigente y los tokens sin `sv` cuando la versión es 0', async () => {
    const { service, prisma } = crear();
    prisma.usuario.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.cl', rol: 'DOCENTE', sesionVersion: 0 });

    await expect(service.validateTokenPayload({ sub: 'u1', sv: 0 })).resolves.toMatchObject({ id: 'u1', actor: 'EVALUADOR' });
    service.invalidateUser('u1');
    await expect(service.validateTokenPayload({ sub: 'u1' })).resolves.toMatchObject({ id: 'u1' });
  });

  it('cerrar sesión sube la versión e invalida la identidad cacheada', async () => {
    const { service, prisma, jwt } = crear();
    prisma.usuario.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.cl', rol: 'DOCENTE', sesionVersion: 0 });
    await service.validateTokenPayload({ sub: 'u1' });
    const token = await jwt.signAsync({ sub: 'u1', actor: 'EVALUADOR' }, { expiresIn: '1h' });

    await expect(service.logout(token)).resolves.toEqual({ ok: true });

    expect(prisma.usuario.updateMany).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { sesionVersion: { increment: 1 } } });
    // La identidad cacheada se descartó: la próxima lectura ve la versión nueva.
    prisma.usuario.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.cl', rol: 'DOCENTE', sesionVersion: 1 });
    await expect(service.validateTokenPayload({ sub: 'u1', sv: 0 })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.usuario.findUnique).toHaveBeenCalledTimes(2);
  });

  it('sin token o con un token inválido solo se limpian las cookies', async () => {
    const { service, prisma } = crear();
    await expect(service.logout(undefined)).resolves.toEqual({ ok: true });
    await expect(service.logout('no-es-un-jwt')).resolves.toEqual({ ok: true });
    expect(prisma.usuario.updateMany).not.toHaveBeenCalled();
  });

  it('reemite la cookie con la versión nueva y conserva el inicio de sesión', async () => {
    const { service, jwt } = crear();
    const ahora = Math.floor(Date.now() / 1000);
    const token = await service.reissueEvaluatorToken({
      id: 'u1', email: 'a@b.cl', rol: 'DOCENTE', actor: 'EVALUADOR', exp: ahora + 100, sessionStart: ahora - 50,
    }, 3);
    const payload = await jwt.verifyAsync<{ sv: number; sessionStart: number; sub: string }>(token);
    expect(payload.sv).toBe(3);
    expect(payload.sessionStart).toBe(ahora - 50);
    expect(payload.sub).toBe('u1');
  });
});
