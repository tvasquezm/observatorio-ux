import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { PersonaSchema } from '@observatorio-ux/shared-types';
import { PersonasPage } from '../PersonasPage';
import { ConfirmDialog } from '../../shared/components/ui/ConfirmDialog';

const state = vi.hoisted(() => ({
  role: 'ESTUDIANTE' as 'ESTUDIANTE' | 'DOCENTE',
  create: vi.fn(), update: vi.fn(), acquire: vi.fn(), release: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(), resetDelete: vi.fn(), deleteError: null as Error | null, deletingId: undefined as string | undefined, deleting: false,
}));

vi.mock('../../features/persona/hooks/usePersonaQueries', () => ({
  usePersonas: () => ({ data: state.list(), isLoading: false, isError: false, error: null }),
  useCreatePersona: () => ({ mutate: state.create, isPending: false, error: null }),
  useUpdatePersona: () => ({ mutate: state.update, isPending: false, error: null }),
  useDeletePersona: () => ({ mutate: state.remove, reset: state.resetDelete, error: state.deleteError, variables: state.deletingId, isPending: state.deleting }),
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
  return render(<><ConfirmDialog /><RouterProvider router={createMemoryRouter([{
    path: '/', element: <Outlet context={{ proyectoId: 'p1' }} />,
    children: [{ index: true, element: <PersonasPage /> }],
  }])} /></>);
}

beforeEach(() => {
  vi.clearAllMocks();
  state.role = 'ESTUDIANTE';
  state.list.mockReturnValue([persona]);
  state.acquire.mockResolvedValue(true);
  state.deleteError = null; state.deletingId = undefined; state.deleting = false;
});

describe('Personas — presentación y edición', () => {
  it('confirma la eliminación del perfil completo y comunica el resultado', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Ana Pérez/)).toBeVisible();
    expect(state.remove).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));
    await vi.waitFor(() => expect(state.remove).toHaveBeenCalledWith('a1', expect.any(Object)));
  });

  it('presenta el error junto al perfil que no se pudo eliminar', () => {
    state.deletingId = 'a1'; state.deleteError = new Error('Otro usuario está editando esta persona.');
    renderPage();
    const card = screen.getByRole('article', { name: 'Ana Pérez' });
    expect(within(card).getByRole('alert')).toHaveTextContent('Otro usuario está editando esta persona.');
  });

  it('impide repetir la eliminación mientras se guarda', () => {
    state.deletingId = 'a1'; state.deleting = true;
    renderPage();
    expect(screen.getByRole('button', { name: 'Eliminando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeDisabled();
  });
  it('agrupa los campos con etiquetas persistentes y conserva el contenido al guardar', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    for (const name of ['Identidad y contexto personal', 'Necesidades y comportamiento',
      'Relación con el servicio', 'Evidencia y validación']) {
      expect(await screen.findByRole('region', { name })).toBeInTheDocument();
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
