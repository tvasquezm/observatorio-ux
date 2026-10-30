import { ConfigService } from '@nestjs/config';
import { ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { GoogleAuthService } from '../google-auth.service.js';

describe('GoogleAuthService', () => {
  const nonce = 'a'.repeat(64);
  const user = { id: 'u1', nombre: 'Ana', email: 'ana@utem.cl', rol: 'DOCENTE', googleSubject: null };
  const payload = { sub: 'google-id', email: user.email, email_verified: true, hd: 'utem.cl', nonce };
  const prisma = { usuario: { findUnique: jest.fn(), updateMany: jest.fn(), create: jest.fn() } };
  const auth = { createEvaluatorSession: jest.fn() };
  let service: GoogleAuthService;
  let verify: jest.SpyInstance;

  beforeEach(() => {
    jest.restoreAllMocks(); jest.resetAllMocks();
    service = new GoogleAuthService(new ConfigService({ GOOGLE_CLIENT_ID: '123-test.apps.googleusercontent.com' }), prisma as never, auth as never);
    verify = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({ getPayload: () => payload } as never);
    prisma.usuario.findUnique.mockResolvedValueOnce(null).mockResolvedValue(user);
    prisma.usuario.updateMany.mockResolvedValue({ count: 1 });
    auth.createEvaluatorSession.mockResolvedValue({ user: { ...user, googleSubject: undefined }, access_token: 'local-session' });
  });

  it('permanece desactivado sin Client ID', async () => {
    service = new GoogleAuthService(new ConfigService(), prisma as never, auth as never);
    await expect(service.login('token', nonce)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(verify).not.toHaveBeenCalled();
  });

  it('valida la audiencia y conserva el rol local de una cuenta autorizada', async () => {
    const result = await service.login('google-token', nonce);
    expect(verify).toHaveBeenCalledWith({ idToken: 'google-token', audience: '123-test.apps.googleusercontent.com' });
    expect(auth.createEvaluatorSession).toHaveBeenCalledWith(user);
    expect(result.user.rol).toBe('DOCENTE');
    expect(prisma.usuario.updateMany).toHaveBeenCalledWith({ where: { id: 'u1', googleSubject: null }, data: { googleSubject: payload.sub } });
    expect(prisma.usuario.create).not.toHaveBeenCalled();
  });

  it('rechaza tokens cuya firma, audiencia o vencimiento no se pueden verificar', async () => {
    verify.mockRejectedValue(new Error('invalid signature'));
    await expect(service.login('invalid-token', nonce)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
  });

  it.each([undefined, 'b'.repeat(64)])('rechaza una sesión sin el nonce correcto', async value => {
    await expect(service.login('token', value)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(auth.createEvaluatorSession).not.toHaveBeenCalled();
  });

  it('no autorregistra a personas que el administrador no ha autorizado', async () => {
    prisma.usuario.findUnique.mockReset().mockResolvedValue(null);
    await expect(service.login('token', nonce)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.usuario.create).not.toHaveBeenCalled();
    expect(auth.createEvaluatorSession).not.toHaveBeenCalled();
  });

  it.each([{ ...payload, email_verified: false }, { ...payload, nonce: 'bad' }])('rechaza identidades no verificadas o de otra solicitud', async invalid => {
    verify.mockResolvedValue({ getPayload: () => invalid });
    await expect(service.login('token', nonce)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('no vincula automáticamente un correo externo cuya propiedad Google no garantiza', async () => {
    verify.mockResolvedValue({ getPayload: () => ({ ...payload, hd: undefined, email: 'ana@example.org' }) });
    await expect(service.login('token', nonce)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.usuario.updateMany).not.toHaveBeenCalled();
  });

  it('no reemplaza la identidad Google ya vinculada a un correo', async () => {
    prisma.usuario.findUnique.mockReset().mockResolvedValueOnce(null).mockResolvedValue({ ...user, googleSubject: 'another-id' });
    await expect(service.login('token', nonce)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reconoce la identidad vinculada aunque cambie el correo en Google', async () => {
    prisma.usuario.findUnique.mockReset().mockResolvedValue({ ...user, googleSubject: payload.sub });
    verify.mockResolvedValue({ getPayload: () => ({ ...payload, email: 'nuevo@utem.cl' }) });
    await service.login('token', nonce);
    expect(prisma.usuario.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.usuario.updateMany).not.toHaveBeenCalled();
  });

  it('conserva las restricciones de acceso locales antes de vincular', async () => {
    auth.createEvaluatorSession.mockRejectedValue(new ForbiddenException('Sin sala activa'));
    await expect(service.login('token', nonce)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.usuario.updateMany).not.toHaveBeenCalled();
  });

  it('no devuelve sesión cuando otra solicitud vincula una identidad distinta', async () => {
    prisma.usuario.updateMany.mockResolvedValue({ count: 0 });
    prisma.usuario.findUnique.mockReset().mockResolvedValueOnce(null).mockResolvedValueOnce(user).mockResolvedValueOnce(null);
    await expect(service.login('token', nonce)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
