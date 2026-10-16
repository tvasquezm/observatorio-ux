import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ComentariosPanel } from './ComentariosPanel';
import { ComentariosTecnica } from './ComentariosTecnica';

const crear = vi.hoisted(() => vi.fn());
const useComments = vi.hoisted(() => vi.fn());

vi.mock('../hooks/useCommentsQueries', () => ({
  useComments,
  useCreateComment: () => ({ mutate: crear, isPending: false }),
  useUpdateComment: () => ({ mutate: vi.fn() }),
  useRemoveComment: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../auth/store/useAuthStore', () => ({
  useAuthStore: (selector: (s: { user: { id: string; nombre: string } }) => unknown) =>
    selector({ user: { id: 'u1', nombre: 'Ana' } }),
}));
vi.mock('../../../shared/auth/useActivePerspective', () => ({ useActivePerspective: () => 'ESTUDIANTE' }));
vi.mock('../../../shared/api/confirm', () => ({ useConfirm: () => vi.fn() }));
vi.mock('../../../shared/hooks/useDiscardChanges', () => ({
  useDiscardChanges: () => ({ confirmDiscard: vi.fn().mockResolvedValue(true) }),
}));

const autor = { id: 'u1', nombre: 'Ana', email: 'ana@x.cl' };
const comentarios = [
  { id: 'c1', proyectoId: 'p1', artefactoLogicoId: null, tecnica: null, texto: 'Comentario general', autorId: 'u1', createdAt: '2026-10-15T10:00:00Z', autor },
  { id: 'c2', proyectoId: 'p1', artefactoLogicoId: null, tecnica: 'personas', texto: 'Comentario de personas', autorId: 'u2', createdAt: '2026-10-15T11:00:00Z', autor: { ...autor, id: 'u2', nombre: 'Luis' } },
];

beforeEach(() => {
  crear.mockReset();
  useComments.mockReset();
  useComments.mockReturnValue({ data: comentarios, isLoading: false, isError: false, error: null, refetch: vi.fn() });
});

describe('ComentariosPanel', () => {
  function plegarComentarios(abierto: boolean) {
    const details = screen.getByText('Comentarios de Personas').closest('details') as HTMLDetailsElement;
    details.open = abierto;
    fireEvent(details, new Event('toggle'));
  }

  it('conserva el comentario nuevo al plegar y reabrir la técnica', () => {
    render(<MemoryRouter><ComentariosTecnica proyectoId="p1" tecnica="personas" /></MemoryRouter>);
    plegarComentarios(true);
    fireEvent.change(screen.getByLabelText('Nuevo comentario'), { target: { value: 'Borrador pendiente' } });

    plegarComentarios(false);
    plegarComentarios(true);

    expect(screen.getByLabelText('Nuevo comentario')).toHaveValue('Borrador pendiente');
  });

  it('conserva la edición al plegar y reabrir la técnica', async () => {
    render(<MemoryRouter><ComentariosTecnica proyectoId="p1" tecnica="personas" /></MemoryRouter>);
    plegarComentarios(true);
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText('Editar comentario'), { target: { value: 'Edición pendiente' } });

    plegarComentarios(false);
    plegarComentarios(true);

    expect(screen.getByLabelText('Editar comentario')).toHaveValue('Edición pendiente');
  });

  it('pasa el filtro y el proyecto a la consulta', () => {
    render(<ComentariosPanel proyectoId="p1" filtro="personas" />);
    expect(useComments).toHaveBeenCalledWith('p1', 'personas');
  });

  it('sin filtro consulta todos los comentarios', () => {
    render(<ComentariosPanel proyectoId="p1" />);
    expect(useComments).toHaveBeenCalledWith('p1', undefined);
  });

  it('muestra el origen de cada comentario solo con mostrarOrigen', () => {
    const { rerender } = render(<ComentariosPanel proyectoId="p1" />);
    expect(screen.queryAllByTestId('comment-origen')).toHaveLength(0);

    rerender(<ComentariosPanel proyectoId="p1" mostrarOrigen />);
    const origenes = screen.getAllByTestId('comment-origen').map((el) => el.textContent);
    expect(origenes).toEqual(['General', 'Personas']);
  });

  it('publica en la tecnica indicada en publicarEn', async () => {
    render(<ComentariosPanel proyectoId="p1" filtro="personas" publicarEn="personas" />);
    await userEvent.type(screen.getByLabelText('Nuevo comentario'), 'Hallazgo nuevo');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar comentario' }));
    expect(crear).toHaveBeenCalledWith({ texto: 'Hallazgo nuevo', tecnica: 'personas' }, expect.any(Object));
  });

  it('sin publicarEn el comentario es general', async () => {
    render(<ComentariosPanel proyectoId="p1" filtro="general" />);
    await userEvent.type(screen.getByLabelText('Nuevo comentario'), 'Nota general');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar comentario' }));
    expect(crear).toHaveBeenCalledWith({ texto: 'Nota general', tecnica: undefined }, expect.any(Object));
  });

  it('solo el autor ve Editar y Borrar', () => {
    render(<ComentariosPanel proyectoId="p1" />);
    expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Borrar' })).toHaveLength(1);
  });

  it('muestra estado vacio sin comentarios', () => {
    useComments.mockReturnValue({ data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() });
    render(<ComentariosPanel proyectoId="p1" filtro="personas" />);
    expect(screen.getByText('La conversación está vacía')).toBeInTheDocument();
  });
});
