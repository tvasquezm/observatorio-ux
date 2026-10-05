import { afterEach, expect, it, vi } from 'vitest';
import { apiFetch } from './api-client';

afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); });

it('envía el Bearer del participante sin la cookie del evaluador', async () => {
  sessionStorage.setItem('participanteToken', 'token-de-prueba');
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
  vi.stubGlobal('fetch', fetchMock);
  await apiFetch('/api/card-sorting/sessions/test', { credentials: 'include' });
  expect(fetchMock).toHaveBeenCalledWith('/api/card-sorting/sessions/test', expect.objectContaining({
    credentials: 'omit', headers: expect.objectContaining({ Authorization: 'Bearer token-de-prueba' }),
  }));
});
