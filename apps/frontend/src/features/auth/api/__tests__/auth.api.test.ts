import { afterEach, describe, expect, it, vi } from 'vitest';
import { changePassword, login } from '../auth.api';

describe('login', () => {
  afterEach(() => {
    document.cookie = 'csrfToken=; Max-Age=0; path=/';
    vi.unstubAllGlobals();
  });

  it('envía el token CSRF cuando otra pestaña mantiene una sesión', async () => {
    document.cookie = 'csrfToken=token-de-otra-pestana; path=/';
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        user: {
          id: 'admin-1',
          nombre: 'Administrador de Prueba',
          email: 'admin@test.com',
          rol: 'ADMIN',
        },
      }),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await login('admin@test.com', 'admin1234');

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init?.headers).get('x-csrf-token')).toBe('token-de-otra-pestana');
  });

  it('cambia solo la contraseña propia enviando cookie y token CSRF', async () => {
    document.cookie = 'csrfToken=token-cambio; path=/';
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as Response);
    vi.stubGlobal('fetch', fetchMock);
    await changePassword('actual-1234', 'nueva-1234');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/password');
    expect(init?.credentials).toBe('include');
    expect(new Headers(init?.headers).get('x-csrf-token')).toBe('token-cambio');
    expect(JSON.parse(init!.body as string)).toEqual({ currentPassword: 'actual-1234', newPassword: 'nueva-1234' });
  });
});
