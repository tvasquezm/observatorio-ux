import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { PersonaSchema } from '@observatorio-ux/shared-types';
import { PersonasPage } from '../PersonasPage';

const state = vi.hoisted(() => ({
  role: 'ESTUDIANTE' as 'ESTUDIANTE' | 'DOCENTE',
  create: vi.fn(), update: vi.fn(), acquire: vi.fn(), release: vi.fn(),
  list: vi.fn(),
}));

vi.mock('../../features/persona/hooks/usePersonaQueries', () => ({
  usePersonas: () => ({ data: state.list(), isLoading: false, isError: false, error: null }),
  useCreatePersona: () => ({ mutate: state.create, isPending: false, error: null }),
  useUpdatePersona: () => ({ mutate: state.update, isPending: false, error: null }),
  useDeletePersona: () => ({ mutate: vi.fn(), error: null }),
}));
vi.mock('../../features/auth/store/useAuthStore', () => ({
  useAuthStore: (selector: (value: unknown) => unknown) => selector({ user: { id: 'reader', rol: state.role } }),
}));
vi.mock('../../shared/auth/useActivePerspective', () => ({ useActivePerspective: () => state.role }));
vi.mock('../../features/projects/hooks/useProjectsQueries', () => ({ useProject: () => ({ data: { creadoPorId: 'owner' } }) }));
vi.mock('../../shared/hooks/useArtifactEditLock', () => ({
  useArtifactEditLock: () => ({ acquire: state.acquire, release: state.release, lockLost: false }),
}));

const persona = {
  id: 'a1', version: 2,
  contenido: PersonaSchema.parse({
    nombreCompleto: 'Ana Pérez', ocupacion: 'Estudiante', edad: 0,
    objetivos: ['Resolver sus trámites'], necesidades: ['Información clara'],
    rolEnServicio: 'Solicitante', evidencia: ['Entrevista 1'], estadoValidacion: 'VALIDADA',
  }),
};

function renderPage() {
  return render(<RouterProvider router={createMemoryRouter([{
    path: '/', element: <Outlet context={{ proyectoId: 'p1' }} />,
    children: [{ index: true, element: <PersonasPage /> }],
  }])} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  state.role = 'ESTUDIANTE';
  state.list.mockReturnValue([persona]);
  state.acquire.mockResolvedValue(true);
});

describe('Personas — presentación y edición', () => {
  it('agrupa los campos con etiquetas persistentes y conserva el contenido al guardar', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    for (const name of ['Identidad y contexto personal', 'Necesidades y comportamiento',
      'Relación con el servicio', 'Evidencia y validación']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Ana Pérez');
    fireEvent.change(screen.getByLabelText('Evidencia que sustenta el perfil'), { target: { value: 'Entrevista 1, Observación' } });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar persona' }));
    expect(state.update).toHaveBeenCalledWith(expect.objectContaining({
      artefactoId: 'a1', expectedVersion: 2,
      contenido: expect.objectContaining({ nombreCompleto: 'Ana Pérez', rolEnServicio: 'Solicitante',
        objetivos: ['Resolver sus trámites'], evidencia: ['Entrevista 1', 'Observación'], estadoValidacion: 'VALIDADA' }),
    }), expect.any(Object));
  });

  it('permite leer el perfil completo sin otorgar edición ni adquirir un lock al DOCENTE', () => {
    state.role = 'DOCENTE';
    renderPage();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Nueva persona' })).not.toBeInTheDocument();
    const card = screen.getByRole('article', { name: 'Ana Pérez' });
    expect(within(card).getByText('Validada')).toBeInTheDocument();
    expect(within(card).getByText(/0 años/)).toBeInTheDocument();
    fireEvent.click(within(card).getByText('Ver perfil completo'));
    expect(within(card).getByText('Entrevista 1')).toBeVisible();
    expect(state.acquire).not.toHaveBeenCalled();
  });

  it('conserva el modo de solo lectura cuando otro usuario tiene el lock', async () => {
    state.acquire.mockRejectedValue(new Error('Bloqueado'));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(await screen.findByText(/No puedes editarla/)).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre completo')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Actualizar persona' })).toBeDisabled();
  });
});
