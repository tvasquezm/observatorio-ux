import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../../../features/auth/store/useAuthStore';
import { PerspectiveRoute } from '../PerspectiveRoute';

const docente = {
  id: 'docente-1',
  nombre: 'Docente',
  email: 'docente@example.com',
  rol: 'DOCENTE' as const,
};

function renderRoutes() {
  return render(
    <MemoryRouter initialEntries={['/salas']}>
      <Routes>
        <Route path="/" element={<p>Inicio</p>} />
        <Route element={<PerspectiveRoute allowed={['DOCENTE', 'ADMIN']} />}>
          <Route path="/salas" element={<p>Gestión de salas</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('PerspectiveRoute', () => {
  afterEach(() => {
    cleanup();
    act(() => {
      useAuthStore.setState({ user: null, perspectiveRole: null, isAuthenticated: false });
    });
  });

  it('bloquea una URL directa cuando el docente está viendo como estudiante', () => {
    act(() => {
      useAuthStore.setState({ user: docente, perspectiveRole: 'ESTUDIANTE', isAuthenticated: true });
    });
    renderRoutes();
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.queryByText('Gestión de salas')).not.toBeInTheDocument();
  });

  it('permite la URL cuando la perspectiva docente está activa', () => {
    act(() => {
      useAuthStore.setState({ user: docente, perspectiveRole: 'DOCENTE', isAuthenticated: true });
    });
    renderRoutes();
    expect(screen.getByText('Gestión de salas')).toBeInTheDocument();
  });
});
