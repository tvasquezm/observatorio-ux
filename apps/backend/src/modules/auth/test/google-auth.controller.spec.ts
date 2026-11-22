import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
jest.unstable_mockModule('@nestjs/throttler', () => ({ Throttle: () => () => {} }));
jest.unstable_mockModule('../../../core/guards/jwt-auth.guard.js', () => ({ JwtAuthGuard: class {} }));
const { AuthController } = await import('../auth.controller.js');

describe('Google auth cookies', () => {
  const google = { clientId: '', login: jest.fn<(...args: unknown[]) => Promise<{ access_token: string; user: { id: string; rol: string } }>>() };
  const response = { cookie: jest.fn(), clearCookie: jest.fn(), setHeader: jest.fn() };
  let controller: InstanceType<typeof AuthController>;
  beforeEach(() => {
    jest.clearAllMocks(); google.clientId = '';
    controller = new AuthController({} as never, new ConfigService({ app: { nodeEnv: 'production' } }), google as never);
  });
  it('no emite cookies ni anuncia una integración sin configurar', () => {
    expect(controller.googleConfig(response as never)).toEqual({ enabled: false });
    expect(response.cookie).not.toHaveBeenCalled();
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });
  it('emite un nonce con cookie HttpOnly, segura y de cinco minutos', () => {
    google.clientId = '123-test.apps.googleusercontent.com';
    const config = controller.googleConfig(response as never);
    expect(config).toMatchObject({ enabled: true, clientId: google.clientId, nonce: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(response.cookie).toHaveBeenCalledWith('googleLoginNonce', expect.any(String), expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'lax', maxAge: 300000 }));
  });
  it('entrega la sesión en cookies y elimina el nonce sin exponer el token en JSON', async () => {
    const user = { id: 'u1', rol: 'DOCENTE' };
    google.login.mockResolvedValue({ access_token: 'local-token', user });
    const result = await controller.googleLogin({ credential: 'credential' }, { cookies: { googleLoginNonce: 'nonce' } } as never, response as never);
    expect(google.login).toHaveBeenCalledWith('credential', 'nonce');
    expect(result).toEqual({ user });
    expect(response.cookie).toHaveBeenCalledWith('evaluadorToken', 'local-token', expect.objectContaining({ httpOnly: true, secure: true }));
    expect(response.cookie).toHaveBeenCalledWith('csrfToken', expect.any(String), expect.objectContaining({ httpOnly: false, secure: true }));
    expect(response.clearCookie).toHaveBeenCalledWith('googleLoginNonce', expect.anything());
  });
});
