import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminProjectsPanel } from './AdminProjectsPanel';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('../../projects/hooks/useProjectsQueries', () => ({
  useAdminProjectOverview: () => ({
    data: [
      {
        id: 'project-1',
        nombre: 'Portal académico',
        descripcion: 'Evaluación del flujo principal',
        creadoPorId: 'docente-1',
        createdAt: '2026-09-01T12:00:00.000Z',
        salaId: null,
        creadoPor: {
          id: 'docente-1',
          nombre: 'Docente Uno',
          email: 'docente@ux.cl',
          rol: 'DOCENTE',
        },
        sesiones: [
          { id: 's1', nombre: 'Sesión 1', tipo: 'CARD_SORTING', estado: 'COMPLETADO', actor: 'PARTICIPANTE', createdAt: '2026-09-01T12:00:00.000Z', completadoAt: '2026-09-01T13:00:00.000Z' },
          { id: 's2', nombre: 'Sesión 2', tipo: 'CARD_SORTING', estado: 'EN_PROGRESO', actor: 'PARTICIPANTE', createdAt: '2026-09-02T12:00:00.000Z', completadoAt: null },
        ],
        _count: { artefactos: 3 },
      },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateProject: () => ({ mutate: mocks.create, isPending: false }),
  useUpdateProject: () => ({ mutate: mocks.update, isPending: false }),
  useDeleteProject: () => ({ mutate: mocks.remove, isPending: false }),
}));

vi.mock('../../../shared/api/confirm', () => ({ useConfirm: () => mocks.confirm }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.confirm.mockResolvedValue(true);
});

describe('AdminProjectsPanel', () => {
  it('muestra responsable y avance de las sesiones', () => {
    render(<MemoryRouter><AdminProjectsPanel /></MemoryRouter>);

    expect(screen.getByText('Portal académico')).toBeInTheDocument();
    expect(screen.getByText('Docente Uno')).toBeInTheDocument();
    expect(screen.getByText('1 de 2 completadas')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Avance de Portal académico' })).toHaveAttribute('value', '1');
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('crea y elimina proyectos desde el panel', async () => {
    render(<MemoryRouter><AdminProjectsPanel /></MemoryRouter>);

    await userEvent.click(screen.getByRole('button', { name: 'Nuevo proyecto' }));
    await userEvent.type(screen.getByLabelText('Nombre'), 'Nuevo estudio');
    await userEvent.type(screen.getByLabelText('Descripción'), 'Prueba de navegación');
    await userEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }));
    expect(mocks.create).toHaveBeenCalledWith(
      { nombre: 'Nuevo estudio', descripcion: 'Prueba de navegación' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(mocks.confirm).toHaveBeenCalledWith(
      '¿Eliminar el proyecto "Portal académico"? Sus datos dejarán de estar disponibles.',
    );
    expect(mocks.remove).toHaveBeenCalledWith('project-1');
  });
});
