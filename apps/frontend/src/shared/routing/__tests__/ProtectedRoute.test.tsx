import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../../../features/auth/store/useAuthStore';
import { AVISO_ESPERA_MS, ProtectedRoute } from '../ProtectedRoute';

const meMock = vi.fn();
const responder = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const usuario = { id: 'u1', nombre: 'Ana', email: 'ana@utem.cl', rol: 'DOCENTE' as const };

function renderRoutes() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/login" element={<p>Pantalla de ingreso</p>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<p>Inicio privado</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute (F43)', () => {
  beforeEach(() => {
    meMock.mockReset();
    vi.stubGlobal('fetch', meMock);
    useAuthStore.setState({ user: null, isAuthenticated: false, isChecking: true, sessionUnreachable: false });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('mientras espera /auth/me muestra un estado de carga y luego avisa que el servidor puede tardar', async () => {
    vi.useFakeTimers();
    let liberar: (r: Response) => void = () => {};
    meMock.mockReturnValue(new Promise<Response>((resolve) => { liberar = resolve; }));
    renderRoutes();
    expect(screen.getByRole('status')).toHaveTextContent('Conectando con el servidor…');
    await act(async () => { vi.advanceTimersByTime(AVISO_ESPERA_MS); });
    expect(screen.getByRole('status')).toHaveTextContent('El servidor se está iniciando. Puede tardar hasta un minuto…');
    // Libera la consulta pendiente para no dejarla compartida con el siguiente test.
    vi.useRealTimers();
    await act(async () => { liberar(responder(401)); });
  });

  it('un 401 lleva al inicio de sesión', async () => {
    meMock.mockResolvedValue(responder(401));
    renderRoutes();
    expect(await screen.findByText('Pantalla de ingreso')).toBeInTheDocument();
  });

  it('un error de red ofrece reintentar, e ir a iniciar sesión, y reintentar vuelve a consultar', async () => {
    meMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    meMock.mockResolvedValueOnce(responder(200, { user: usuario, session: { expiresAt: Date.now() + 60_000 } }));
    renderRoutes();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar con el servidor');
    expect(screen.getByRole('link', { name: 'Ir a iniciar sesión' })).toHaveAttribute('href', '/login');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Inicio privado')).toBeInTheDocument();
    expect(meMock).toHaveBeenCalledTimes(2);
  });

  it('un 503 (servidor iniciando) no borra la sesión guardada', async () => {
    localStorage.setItem('evaluadorUser', JSON.stringify(usuario));
    meMock.mockResolvedValue(responder(503));
    renderRoutes();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(localStorage.getItem('evaluadorUser')).not.toBeNull();
    localStorage.removeItem('evaluadorUser');
  });
});
