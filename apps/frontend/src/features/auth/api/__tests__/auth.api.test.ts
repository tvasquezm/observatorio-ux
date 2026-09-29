import { afterEach, describe, expect, it, vi } from 'vitest';
import { login } from '../auth.api';

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
});
