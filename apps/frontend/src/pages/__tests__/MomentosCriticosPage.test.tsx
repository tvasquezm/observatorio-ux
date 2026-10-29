import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { MomentosCriticosSchema } from '@observatorio-ux/shared-types';
import { MomentosCriticosPage } from '../MomentosCriticosPage';
import { ArtifactsApiError } from '../../shared/api/artifacts.api';

const state = vi.hoisted(() => ({
  role: 'ESTUDIANTE',
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  acquire: vi.fn(),
  release: vi.fn(),
  remove: vi.fn(),
  confirm: vi.fn(),
  lockLost: false,
  error: null as Error | null,
}));
vi.mock('../../features/momentos-criticos/hooks/useMomentosCriticosQueries', () => ({
  useCriticalMoments: () => ({ data: state.list(), isLoading: false, isError: false, error: null }),
  useCreateCriticalMoment: () => ({ mutate: state.create, isPending: false, error: state.error }),
  useUpdateCriticalMoment: () => ({ mutate: state.update, isPending: false, error: null }),
  useDeleteCriticalMoment: () => ({ mutate: state.remove, isPending: false, error: null }),
}));
vi.mock('../../features/auth/store/useAuthStore', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ user: { id: 'u1', rol: state.role } }),
}));
vi.mock('../../shared/auth/useActivePerspective', () => ({ useActivePerspective: () => state.role }));
vi.mock('../../features/projects/hooks/useProjectsQueries', () => ({
  useProject: () => ({ data: { creadoPorId: 'owner' } }),
}));
vi.mock('../../shared/hooks/useArtifactEditLock', () => ({
  useArtifactEditLock: () => ({ acquire: state.acquire, release: state.release, lockLost: state.lockLost }),
}));
vi.mock('../../shared/api/confirm', () => ({ useConfirm: () => state.confirm }));

const contenido = {
  perfilUsuario: { id: 'perfil-1', nombre: 'Ana', rol: 'Compradora frecuente' },
  incidentes: [
    {
      nombre: 'Checkout falla',
      descripcion: 'No logra completar el pago.',
      tipo: 'Negativo',
      impacto: 'Alto',
      frecuencia: 'Alta',
      causa: 'Error al confirmar.',
      accionesSugeridas: ['Revisar el pago, sin perder el carrito'],
    },
    {
      nombre: 'Ayuda inmediata',
      descripcion: 'Resuelve su duda.',
      tipo: 'Positivo',
      impacto: 'Alto',
      frecuencia: 'Alta',
      causa: 'Respuesta clara.',
      accionesSugeridas: ['Mantener la ayuda'],
    },
    {
      nombre: 'Etiqueta confusa',
      descripcion: 'Busca más tiempo.',
      tipo: 'Negativo',
      impacto: 'Bajo',
      frecuencia: 'Baja',
      causa: 'Nombre poco claro.',
      accionesSugeridas: ['Renombrar'],
    },
  ],
};
const momento = { id: 'a1', artefactoLogicoId: 'l1', version: 3, contenido };
function renderPage() {
  return render(
    <RouterProvider
      router={createMemoryRouter([
        {
          path: '/',
          element: <Outlet context={{ proyectoId: 'p1' }} />,
          children: [{ index: true, element: <MomentosCriticosPage /> }],
        },
      ])}
    />,
  );
}
function abrirNuevo() {
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: '+ Nuevo momento crítico' }));
}
function siguiente(veces: number) {
  for (let i = 0; i < veces; i++) fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
}
function llenarPerfil() {
  fireEvent.change(screen.getByLabelText('Nombre del perfil de usuario'), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'Compradora' } });
}
beforeEach(() => {
  vi.clearAllMocks();
  state.role = 'ESTUDIANTE';
  state.lockLost = false;
  state.error = null;
  state.list.mockReturnValue([]);
  state.acquire.mockResolvedValue(true);
  state.confirm.mockResolvedValue(false);
});

describe('Momentos críticos', () => {
  it('valida todos los campos con el mismo contrato que la API y conserva el borrador', () => {
    abrirNuevo();
    llenarPerfil();
    fireEvent.change(screen.getByLabelText('Nombre del incidente 1'), { target: { value: 'Pago' } });
    siguiente(4);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar momento crítico' }));
    expect(state.create).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/descripción.*vacía/i);
    expect(screen.getByLabelText('Descripción incidente 1')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Nombre del incidente 1')).toHaveValue('Pago');
    const completo = MomentosCriticosSchema.parse(contenido);
    for (const campo of ['nombre', 'descripcion', 'causa', 'accionesSugeridas'] as const) {
      const inc = { ...completo.incidentes[0], [campo]: campo === 'accionesSugeridas' ? ['  '] : '  ' };
      expect(MomentosCriticosSchema.safeParse({ ...completo, incidentes: [inc] }).success).toBe(false);
    }
    expect(
      MomentosCriticosSchema.safeParse({
        ...completo,
        perfilUsuario: { ...completo.perfilUsuario, rol: '  ' },
      }).success,
    ).toBe(false);
  });
  it('guarda acciones por línea, preserva las comas y usa la versión editada', async () => {
    state.list.mockReturnValue([momento]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    siguiente(4);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Actualizar momento crítico' })).not.toBeDisabled(),
    );
    fireEvent.change(screen.getByLabelText('Acciones sugeridas incidente 1'), {
      target: { value: ' Revisar el pago, sin perder el carrito\n Medir el resultado ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar momento crítico' }));
    expect(state.update).toHaveBeenCalledWith(
      expect.objectContaining({
        artefactoId: 'a1',
        expectedVersion: 3,
        contenido: expect.objectContaining({
          incidentes: expect.arrayContaining([
            expect.objectContaining({
              accionesSugeridas: ['Revisar el pago, sin perder el carrito', 'Medir el resultado'],
            }),
          ]),
        }),
      }),
      expect.any(Object),
    );
  });
  it('bloquea el envío mientras adquiere el permiso y después de un conflicto 409', async () => {
    let reject!: (e: unknown) => void;
    state.acquire.mockReturnValue(
      new Promise((_, r) => {
        reject = r;
      }),
    );
    state.list.mockReturnValue([momento]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(screen.getByLabelText('Nombre del perfil de usuario')).toBeDisabled();
    fireEvent.submit(screen.getByLabelText('Nombre del perfil de usuario').closest('form')!);
    expect(state.update).not.toHaveBeenCalled();
    reject(new ArtifactsApiError(409, 'Ocupado'));
    await screen.findByText(/está bloqueado por otro usuario/i);
    expect(screen.getByLabelText('Nombre del perfil de usuario')).toBeDisabled();
  });
  it('muestra quién está editando cuando el 409 trae el nombre', async () => {
    state.acquire.mockRejectedValue(new ArtifactsApiError(409, 'Editando: Luis Soto'));
    state.list.mockReturnValue([momento]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(await screen.findByText(/Editando: Luis Soto\./)).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre del perfil de usuario')).toBeDisabled();
  });
  it('no permite quitar el último incidente y mantiene alineadas sus acciones', () => {
    abrirNuevo();
    siguiente(1);
    expect(screen.getByRole('button', { name: 'Quitar incidente' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar incidente' }));
    fireEvent.change(screen.getByLabelText('Acciones sugeridas incidente 2'), {
      target: { value: 'Segunda acción' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Quitar incidente' })[0]);
    expect(screen.getByRole('button', { name: 'Quitar incidente' })).toBeDisabled();
    expect(screen.getByLabelText('Acciones sugeridas incidente 1')).toHaveValue('Segunda acción');
  });
  it('muestra quién guardó la última versión y cuándo', () => {
    state.list.mockReturnValue([{ ...momento, autor: { id: 'u1', nombre: 'Ana Pérez' }, createdAt: '2026-10-27T15:30:00Z' }]);
    renderPage();
    expect(screen.getByText(/^Última edición por Ana Pérez · \d{1,2} /)).toBeInTheDocument();
    expect(screen.getByText(/Versión 3/)).toBeInTheDocument();
  });
  it('permite a docentes leer detalles y distingue oportunidades positivas de problemas', () => {
    state.role = 'DOCENTE';
    state.list.mockReturnValue([momento]);
    renderPage();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    const positive = screen.getByRole('region', { name: 'Ayuda inmediata' });
    expect(within(positive).getByText('Oportunidad de refuerzo')).toBeInTheDocument();
    expect(within(positive).queryByText('Prioridad alta')).not.toBeInTheDocument();
    fireEvent.click(within(positive).getByText('Ver causa y acciones'));
    expect(within(positive).getByText('Mantener la ayuda')).toBeVisible();
    expect(state.acquire).not.toHaveBeenCalled();
  });
  it('filtra lista y matriz por el mismo conjunto sin perder detalles', () => {
    state.list.mockReturnValue([momento]);
    renderPage();
    fireEvent.change(screen.getByLabelText('Tipo de incidente'), { target: { value: 'Positivo' } });
    expect(screen.queryByText('Checkout falla')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver Matriz 3x3' }));
    const cell = screen.getByTestId('celda-Alto-Alta');
    expect(within(cell).getByText('Ayuda inmediata')).toBeInTheDocument();
    expect(within(cell).queryByText('Prioridad alta')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tipo de incidente'), { target: { value: 'Todos' } });
    expect(within(screen.getByTestId('celda-Bajo-Baja')).getByText('Etiqueta confusa')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar incidentes'), {
      target: { value: 'sin perder el carrito' },
    });
    expect(within(cell).getByText('Checkout falla')).toBeInTheDocument();
    expect(screen.queryByText('Ayuda inmediata')).not.toBeInTheDocument();
  });
  it('conserva el borrador cuando se cancela el descarte y libera el permiso al confirmar', async () => {
    abrirNuevo();
    fireEvent.change(screen.getByLabelText('Nombre del incidente 1'), { target: { value: 'Sin guardar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(state.confirm).toHaveBeenCalled());
    expect(screen.getByLabelText('Nombre del incidente 1')).toHaveValue('Sin guardar');
    state.confirm.mockResolvedValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByLabelText('Nombre del incidente 1')).not.toBeInTheDocument());
    expect(state.release).toHaveBeenCalled();
  });
  it('no permite guardar sin nombre y rol del perfil y explica el motivo', () => {
    abrirNuevo();
    siguiente(4);
    expect(screen.getByRole('button', { name: 'Guardar momento crítico' })).toBeDisabled();
    expect(screen.getByText(/Falta el nombre y el rol del perfil/)).toBeInTheDocument();
    llenarPerfil();
    expect(screen.getByRole('button', { name: 'Guardar momento crítico' })).not.toBeDisabled();
    expect(screen.queryByText(/Falta el nombre y el rol del perfil/)).not.toBeInTheDocument();
  });
  it('avisa que el momento crítico está listo solo cuando todos los pasos están completos', () => {
    abrirNuevo();
    expect(screen.getByRole('img', { name: '0 de 5' })).toBeInTheDocument();
    expect(screen.queryByText('Momento crítico completo: ya puedes guardarlo')).not.toBeInTheDocument();
    llenarPerfil();
    fireEvent.change(screen.getByLabelText('Nombre del incidente 1'), { target: { value: 'Pago' } });
    fireEvent.change(screen.getByLabelText('Descripción incidente 1'), { target: { value: 'No avanza' } });
    fireEvent.change(screen.getByLabelText('Causa incidente 1'), { target: { value: 'Botón oculto' } });
    expect(screen.queryByText('Momento crítico completo: ya puedes guardarlo')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Acciones sugeridas incidente 1'), { target: { value: 'Mostrar el botón' } });
    expect(screen.getByRole('img', { name: '5 de 5, completo' })).toBeInTheDocument();
    expect(screen.getByText('Momento crítico completo: ya puedes guardarlo')).toBeInTheDocument();
  });
  it('mientras el formulario está abierto oculta la lista y el resumen', () => {
    state.list.mockReturnValue([momento]);
    renderPage();
    expect(screen.getByRole('region', { name: 'Resumen de incidentes' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '+ Nuevo momento crítico' }));
    expect(screen.queryByRole('region', { name: 'Resumen de incidentes' })).not.toBeInTheDocument();
    expect(screen.queryByText('Ver causa y acciones')).not.toBeInTheDocument();
  });
  it('pone el botón de nuevo en la cabecera y mantiene una sola instancia del proceso', () => {
    state.list.mockReturnValue([momento]);
    renderPage();
    const nuevo = screen.getByRole('button', { name: '+ Nuevo momento crítico' });
    expect(nuevo.closest('.page-head')).not.toBeNull();
    expect(nuevo.closest('.panel-head')).toBeNull();
    expect(screen.getAllByRole('region', { name: 'Proceso de momentos críticos' })).toHaveLength(1);
    fireEvent.click(nuevo);
    expect(screen.getByRole('button', { name: 'Cancelar' }).closest('.page-head')).not.toBeNull();
    expect(screen.getAllByRole('region', { name: 'Proceso de momentos críticos' })).toHaveLength(1);
  });
  it('indica solo lectura en la cabecera cuando no puede editar', () => {
    state.role = 'DOCENTE';
    state.list.mockReturnValue([momento]);
    renderPage();
    expect(screen.getByText('Solo lectura')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Nuevo momento crítico' })).not.toBeInTheDocument();
  });
  it('ofrece Editar secundario y Eliminar de peligro, en ese orden, sin enlaces de texto', () => {
    state.list.mockReturnValue([momento]);
    renderPage();
    const card = screen.getByRole('article', { name: 'Ana' });
    const editar = within(card).getByRole('button', { name: 'Editar' });
    const eliminar = within(card).getByRole('button', { name: 'Eliminar' });
    expect(editar).toHaveClass('secondary');
    expect(eliminar).toHaveClass('danger');
    expect(editar.compareDocumentPosition(eliminar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card.querySelector('.link-btn')).toBeNull();
    expect(editar.closest('.technique-item-actions')).not.toBeNull();
  });
  it('pide confirmación antes de eliminar y no elimina si se cancela', async () => {
    state.list.mockReturnValue([momento]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(state.confirm).toHaveBeenCalledWith('¿Estás seguro de eliminar este momento crítico?'));
    expect(state.remove).not.toHaveBeenCalled();
  });
  it('elimina cuando se confirma', async () => {
    state.list.mockReturnValue([momento]);
    state.confirm.mockResolvedValue(true);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(state.remove).toHaveBeenCalledWith('a1'));
  });
  it('no muestra acciones de elemento sin permiso de edición', () => {
    state.role = 'DOCENTE';
    state.list.mockReturnValue([momento]);
    renderPage();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
  });
  it('titula la lista con contador de incidentes y deja la vista de matriz como control secundario', () => {
    state.list.mockReturnValue([momento]);
    renderPage();
    const cabecera = screen.getByRole('heading', { name: 'Incidentes y acciones' }).closest('.technique-list-head')!;
    expect(within(cabecera as HTMLElement).getByText('3', { selector: '.short-id' })).toBeInTheDocument();
    const vista = within(cabecera as HTMLElement).getByRole('button', { name: 'Ver Matriz 3x3' });
    expect(vista).toHaveClass('secondary');
    expect(vista.closest('.technique-list-view')).not.toBeNull();
  });
  it('muestra el vacío estándar cuando no hay momentos críticos', () => {
    renderPage();
    const vacio = screen.getByText('Aún no hay momentos críticos').closest('.technique-empty');
    expect(vacio).not.toBeNull();
    expect(within(vacio as HTMLElement).getByText(/Registra el perfil de un usuario/)).toBeInTheDocument();
  });
  it('mantiene el borrador ante errores de guardado', () => {
    state.error = new Error('Sin conexión');
    abrirNuevo();
    fireEvent.change(screen.getByLabelText('Nombre del incidente 1'), { target: { value: 'Conservar' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión');
    expect(screen.getByLabelText('Nombre del incidente 1')).toHaveValue('Conservar');
  });
});
