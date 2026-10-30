import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleSignIn } from './GoogleSignIn';

const mocks = vi.hoisted(() => ({ config: vi.fn(), login: vi.fn(), setSession: vi.fn(), initialize: vi.fn(), renderButton: vi.fn() }));
vi.mock('../api/auth.api', () => ({ getGoogleLoginConfig: mocks.config, loginWithGoogle: mocks.login }));
vi.mock('../store/useAuthStore', () => ({ useAuthStore: (selector: (state: { setSession: typeof mocks.setSession }) => unknown) => selector({ setSession: mocks.setSession }) }));
function show() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><GoogleSignIn /></QueryClientProvider>); }

beforeEach(() => {
  vi.resetAllMocks();
  window.google = { accounts: { id: { initialize: mocks.initialize, renderButton: mocks.renderButton } } };
});

describe('GoogleSignIn', () => {
  it('no muestra ni inicializa Google mientras no se configure', async () => {
    mocks.config.mockResolvedValue({ enabled: false });
    show();
    await waitFor(() => expect(mocks.config).toHaveBeenCalled());
    expect(screen.queryByRole('region', { name: 'Acceso con Google' })).not.toBeInTheDocument();
    expect(mocks.initialize).not.toHaveBeenCalled();
  });

  it('usa el nonce y Client ID del servidor y abre la sesión devuelta por el backend', async () => {
    mocks.config.mockResolvedValue({ enabled: true, clientId: '123-test.apps.googleusercontent.com', nonce: 'server-nonce' });
    const user = { id: 'u1', nombre: 'Ana', email: 'ana@utem.cl', rol: 'DOCENTE' };
    mocks.login.mockResolvedValue({ user });
    show();
    await waitFor(() => expect(mocks.renderButton).toHaveBeenCalled());
    const options = mocks.initialize.mock.calls[0][0];
    expect(options).toMatchObject({ client_id: '123-test.apps.googleusercontent.com', nonce: 'server-nonce', auto_select: false });
    await act(async () => options.callback({ credential: 'verified-by-backend' }));
    await waitFor(() => expect(mocks.setSession).toHaveBeenCalledWith(user));
    expect(mocks.login).toHaveBeenCalledWith('verified-by-backend', expect.anything());
  });

  it('muestra el rechazo del backend sin abrir una sesión', async () => {
    mocks.config.mockResolvedValue({ enabled: true, clientId: '123-test.apps.googleusercontent.com', nonce: 'nonce' });
    mocks.login.mockRejectedValue(new Error('Cuenta no autorizada'));
    show();
    await waitFor(() => expect(mocks.initialize).toHaveBeenCalled());
    await act(async () => mocks.initialize.mock.calls[0][0].callback({ credential: 'credential' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cuenta no autorizada');
    expect(mocks.setSession).not.toHaveBeenCalled();
  });
});
