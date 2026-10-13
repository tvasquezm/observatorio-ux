import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { JourneyMapPage } from '../JourneyMapPage';
import type { JourneyMapContenido } from '../../features/journey-map/api/journey-map.api';

const state = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('../../features/journey-map/hooks/useJourneyMapQueries', () => ({
  useJourneys: () => ({ data: [], isLoading: false, isError: false, error: null }),
  useCreateJourney: () => ({ mutate: state.create, isPending: false, error: null }),
}));
vi.mock('../../features/auth/store/useAuthStore', () => ({
  useAuthStore: (selector: (value: unknown) => unknown) => selector({ user: { id: 'owner', rol: 'ESTUDIANTE' } }),
}));
vi.mock('../../shared/auth/useActivePerspective', () => ({ useActivePerspective: () => 'ESTUDIANTE' }));
vi.mock('../../features/projects/hooks/useProjectsQueries', () => ({ useProject: () => ({ data: { creadoPorId: 'owner' } }) }));

beforeEach(() => {
  vi.clearAllMocks();
  state.create.mockImplementation((_payload: JourneyMapContenido, options: { onSuccess: () => void }) => options.onSuccess());
});

describe('Journey Map — creación', () => {
  it('conserva la actividad en su fase al quitar otra fase, incluso después de reiniciar el formulario', () => {
    render(<RouterProvider router={createMemoryRouter([{
      path: '/', element: <Outlet context={{ proyectoId: 'p1' }} />,
      children: [{ index: true, element: <JourneyMapPage /> }],
    }])} />);
    for (let run = 0; run < 2; run++) {
      fireEvent.click(screen.getByRole('button', { name: '+ Nuevo Journey Map' }));
      fireEvent.change(screen.getByLabelText('Nombre del perfil de usuario'), { target: { value: 'Ana' } });
      fireEvent.change(screen.getByLabelText('Rol del usuario'), { target: { value: 'Solicitante' } });
      fireEvent.click(screen.getByRole('button', { name: '+ Agregar fase' }));
      fireEvent.change(screen.getByLabelText('Actividades fase 4'), { target: { value: 'Solo en fase cuatro' } });
      fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar fase' })[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Guardar Journey Map' }));
      const payload = state.create.mock.calls[run][0] as JourneyMapContenido;
      expect(payload.fases.map((phase) => ({ nombre: phase.nombre, actividades: phase.actividades }))).toEqual([
        { nombre: 'Consideración', actividades: [] }, { nombre: 'Decisión', actividades: [] },
        { nombre: 'Fase 4', actividades: ['Solo en fase cuatro'] },
      ]);
    }
  });
});
