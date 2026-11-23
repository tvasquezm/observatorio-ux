import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';

const auth = vi.hoisted(() => ({ role: null as string | null }));
vi.mock('../features/auth/components/SessionExpiryDialog', () => ({ SessionExpiryDialog: () => null }));
vi.mock('../features/auth/store/useAuthStore', () => ({
  useAuthStore: () => ({
    user: auth.role ? { id: 'u1', nombre: 'Ana Pérez', rol: auth.role } : null,
    perspectiveRole: auth.role,
    setPerspective: vi.fn(),
    logout: vi.fn(),
  }),
}));
beforeEach(() => {
  auth.role = null;
  localStorage.clear();
  delete document.documentElement.dataset.contrast;
  delete document.documentElement.dataset.fontSize;
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
});
describe('Preferencia de contraste', () => {
  it.each([['/salas/sala-1', 'Detalle de sala'], ['/salas/eliminadas', 'Salas eliminadas']])('identifica la ruta %s', (path, title) => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={[path]}><AppLayout /></MemoryRouter></QueryClientProvider>);
    expect(document.title).toBe(`${title} · Observatorio UX`);
    expect(screen.getByRole('navigation', { name: 'Ubicación general' })).toHaveTextContent(title);
  });
  it('activa alto contraste, lo conserva al volver y permite restaurar contraste normal', () => {
    const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><AppLayout /></MemoryRouter></QueryClientProvider>);
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Configuración' }));
    fireEvent.click(screen.getByRole('button', { name: 'Alto contraste' }));
    expect(document.documentElement.dataset.contrast).toBe('high');
    expect(localStorage.getItem('observatorio-ux-contrast')).toBe('high');
    cleanup();
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Configuración' }));
    const toggle = screen.getByRole('button', { name: 'Alto contraste' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    expect(document.documentElement.dataset.contrast).toBe('normal');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('conserva el contraste elegido al cambiar entre modo claro y oscuro', () => {
    localStorage.setItem('observatorio-ux-contrast', 'high');
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><AppLayout /></MemoryRouter></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Configuración' }));
    fireEvent.click(screen.getByRole('button', { name: 'Activar modo oscuro' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.dataset.contrast).toBe('high');
  });
});

describe('Preferencia de tamaño del texto', () => {
  const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><AppLayout /></MemoryRouter></QueryClientProvider>);
  const open = () => fireEvent.click(screen.getByRole('button', { name: 'Tamaño del texto' }));
  const up = () => fireEvent.click(screen.getByRole('button', { name: 'Aumentar tamaño del texto' }));
  const down = () => fireEvent.click(screen.getByRole('button', { name: 'Reducir tamaño del texto' }));

  it('ajusta el tamaño desde la barra, cierra el panel y no aparece en Configuración', async () => {
    mount();
    const button = screen.getByRole('button', { name: 'Tamaño del texto' });
    expect(button.closest('.top-actions')).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const picker = screen.getByRole('group', { name: 'Tamaño del texto' });
    await userEvent.click(within(picker).getByRole('button', { name: 'Aumentar tamaño del texto' }));
    expect(within(picker).getByText('112.5 %')).toBeVisible();
    expect(document.documentElement.dataset.fontSize).toBe('large');
    await userEvent.keyboard('{Escape}');
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(picker).not.toBeVisible();
    await userEvent.click(button);
    await userEvent.click(screen.getByRole('button', { name: 'Configuración' }));
    expect(button).toHaveAttribute('aria-expanded', 'false');
    const dialog = screen.getByRole('dialog', { name: 'Configuración' });
    expect(within(dialog).queryByRole('group', { name: 'Tamaño del texto' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Aumentar tamaño del texto' })).not.toBeInTheDocument();
  });

  it('aumenta, lo conserva al remontar y reduce hasta Normal', () => {
    mount();
    open();
    expect(screen.getByRole('group', { name: 'Tamaño del texto' })).toBeInTheDocument();
    up();
    expect(document.documentElement.dataset.fontSize).toBe('large');
    expect(localStorage.getItem('observatorio-ux-font-size')).toBe('large');
    cleanup();
    mount();
    open();
    expect(screen.getByText('112.5 %')).toBeInTheDocument();
    down();
    expect(document.documentElement.dataset.fontSize).toBe('normal');
    expect(localStorage.getItem('observatorio-ux-font-size')).toBe('normal');
  });

  it('recorre los 5 pasos y se detiene en los extremos', () => {
    mount();
    open();
    expect(screen.getByRole('button', { name: 'Reducir tamaño del texto' })).toBeDisabled();
    ['large', 'xlarge', 'xxlarge', 'huge'].forEach((size) => {
      up();
      expect(document.documentElement.dataset.fontSize).toBe(size);
    });
    expect(screen.getByRole('button', { name: 'Aumentar tamaño del texto' })).toBeDisabled();
    expect(screen.getByText('150 %')).toBeInTheDocument();
  });

  it('un valor inválido en localStorage cae a normal', () => {
    localStorage.setItem('observatorio-ux-font-size', 'gigante');
    mount();
    expect(document.documentElement.dataset.fontSize).toBe('normal');
  });

  it('cambiar tema oscuro o alto contraste no altera el tamaño', () => {
    localStorage.setItem('observatorio-ux-font-size', 'xlarge');
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Configuración' }));
    fireEvent.click(screen.getByRole('button', { name: 'Activar modo oscuro' }));
    fireEvent.click(screen.getByRole('button', { name: 'Alto contraste' }));
    expect(document.documentElement.dataset.fontSize).toBe('xlarge');
    open();
    expect(screen.getByText('125 %')).toBeInTheDocument();
  });
});

describe('Selector "Viendo como"', () => {
  it.each([['DOCENTE', true], ['ADMIN', true], ['ESTUDIANTE', false]])('rol %s: visible=%s', (role, visible) => {
    auth.role = role;
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><AppLayout /></MemoryRouter></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Configuración' }));
    const status = screen.queryByText(/Viendo como/);
    expect(!!status).toBe(visible);
    expect(!!screen.queryByRole('group', { name: 'Cambiar perspectiva' })).toBe(visible);
  });
  it('abre configuración en un diálogo y permite cerrarlo', () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><AppLayout /></MemoryRouter></QueryClientProvider>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Configuración' }));
    expect(screen.getByRole('dialog', { name: 'Configuración' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar configuración' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Configuración: contraseña', () => {
  it('muestra Cambiar contraseña colapsado y se despliega a pedido', () => {
    auth.role = 'DOCENTE';
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><AppLayout /></MemoryRouter></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Configuración' }));
    const dialog = screen.getByRole('dialog', { name: 'Configuración' });
    const details = dialog.querySelector('details.password-collapse') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(screen.getByLabelText('Contraseña actual')).not.toBeVisible();
    fireEvent.click(within(dialog).getByText('Cambiar contraseña', { selector: 'summary' }));
    expect(details.open).toBe(true);
  });
});

describe('Barra lateral', () => {
  it('permite minimizar y expandir con teclado, conservando los accesos', async () => {
    auth.role = 'ADMIN';
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><AppLayout /></MemoryRouter></QueryClientProvider>);
    await waitFor(() => expect(document.getElementById('main-content')).toHaveFocus());
    const toggle = screen.getByRole('button', { name: 'Minimizar barra lateral' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    toggle.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Expandir barra lateral' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('complementary', { name: 'Navegación principal' }).parentElement).toHaveClass('side-collapsed');
    expect(screen.getByRole('link', { name: 'Salas' })).toHaveAttribute('href', '/salas');
    expect(screen.getByRole('button', { name: 'Salir' })).toBeEnabled();
    await userEvent.keyboard(' ');
    expect(screen.getByRole('button', { name: 'Minimizar barra lateral' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('complementary', { name: 'Navegación principal' }).parentElement).not.toHaveClass('side-collapsed');
  });

  it('conserva las restricciones de acceso al minimizar', () => {
    auth.role = 'ESTUDIANTE';
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><AppLayout /></MemoryRouter></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Minimizar barra lateral' }));
    expect(screen.getByRole('button', { name: 'Expandir barra lateral' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Salas' })).toHaveAttribute('href', '/salas');
    expect(screen.getByRole('link', { name: 'Proyectos' })).toHaveAttribute('href', '/proyectos');
  });

  it('entra abierta y permanece abierta al navegar y usar el contenido', () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><AppLayout /></MemoryRouter></QueryClientProvider>);
    const side = screen.getByRole('complementary', { name: 'Navegación principal' }).parentElement;
    expect(side).not.toHaveClass('side-collapsed');
    fireEvent.click(document.querySelector('#sidebar-navigation a[href="/"]')!);
    expect(side).not.toHaveClass('side-collapsed');
    fireEvent.click(screen.getByRole('link', { name: 'Proyectos' }));
    expect(side).not.toHaveClass('side-collapsed');
    fireEvent.pointerDown(document.getElementById('main-content')!);
    expect(side).not.toHaveClass('side-collapsed');
    expect(screen.getByRole('button', { name: 'Minimizar barra lateral' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('conserva la elección manual al navegar y volver a cargar el layout', () => {
    const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><AppLayout /></MemoryRouter></QueryClientProvider>);
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Minimizar barra lateral' }));
    fireEvent.click(screen.getByRole('link', { name: 'Proyectos' }));
    expect(screen.getByRole('button', { name: 'Expandir barra lateral' })).toHaveAttribute('aria-expanded', 'false');
    cleanup();
    mount();
    expect(screen.getByRole('button', { name: 'Expandir barra lateral' })).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Expandir barra lateral' }));
    cleanup();
    mount();
    expect(screen.getByRole('button', { name: 'Minimizar barra lateral' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('permite cerrarla explícitamente con Escape y devuelve el foco al control', () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><AppLayout /></MemoryRouter></QueryClientProvider>);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Minimizar barra lateral' }), { key: 'Escape' });
    const toggle = screen.getByRole('button', { name: 'Expandir barra lateral' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });
});
