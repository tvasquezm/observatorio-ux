import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SalaDetallePage } from './SalaDetallePage';
import { SalasApiError } from '../api/salas.api';
import { useAuthStore } from '../../auth/store/useAuthStore';

const salaQuery = vi.hoisted(() => ({ data: undefined as unknown, isLoading: false, isError: true, error: null as Error | null, refetch: vi.fn() }));
vi.mock('../hooks/useSalasQueries', () => ({ useSala: () => salaQuery }));

beforeEach(() => {
  salaQuery.data = undefined;
  salaQuery.error = new SalasApiError(403, 'No estás asignado a esta sala. Pide a tu docente que registre el correo de tu cuenta.');
  useAuthStore.setState({ user: { id: 'u1', nombre: 'Ana', email: 'ana@utem.cl', rol: 'ESTUDIANTE' }, perspectiveRole: 'ESTUDIANTE' });
});

function setup() {
  return render(<MemoryRouter initialEntries={['/salas/s1']}><Routes><Route path="/salas/:salaId" element={<SalaDetallePage />} /></Routes></MemoryRouter>);
}

describe('acceso a una sala', () => {
  it('mantiene una explicación y una salida visibles para el estudiante no asignado', () => {
    setup();
    expect(screen.getByRole('alert')).toHaveTextContent('No estás asignado');
    expect(screen.getByRole('alert')).toHaveTextContent('ana@utem.cl');
    expect(screen.getByRole('link', { name: 'Ver mis salas' })).toHaveAttribute('href', '/salas');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(salaQuery.refetch).toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeVisible();
  });
  it('distingue un fallo del servidor y oculta contenido cacheado al perder acceso', () => {
    salaQuery.error = new SalasApiError(503, 'Servidor no disponible');
    salaQuery.data = { nombre: 'Sala cacheada' };
    setup();
    expect(screen.getByRole('heading', { name: 'No se pudo abrir la sala' })).toBeVisible();
    expect(screen.queryByText('Sala cacheada')).toBeNull();
    expect(screen.queryByText(/Solicita la asignación/)).toBeNull();
  });
});
