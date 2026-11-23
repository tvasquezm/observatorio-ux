import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('avisa de las cookies necesarias y enlaza a la página de privacidad', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText(/Usamos cookies necesarias/)).toBeInTheDocument();
    const enlace = screen.getByRole('link', { name: 'Más información' });
    expect(enlace).toHaveAttribute('href', '/privacidad');
    expect(enlace).toHaveAttribute('target', '_blank');
    expect(enlace).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('F35: si el servidor desactivó la contraseña, solo queda Continuar con Google', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ enabled: false, passwordLogin: false }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><LoginPage /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText('¿No puedes ingresar?')).toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ingresar' })).toBeNull();
  });
});
