import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { JourneyMapPage } from '../JourneyMapPage';
import type { JourneyMapContenido } from '../../features/journey-map/api/journey-map.api';

const state = vi.hoisted(() => ({ create: vi.fn(), list: vi.fn() }));
vi.mock('../../features/journey-map/hooks/useJourneyMapQueries', () => ({
  useJourneys: () => ({ data: state.list(), isLoading: false, isError: false, error: null }),
  useCreateJourney: () => ({ mutate: state.create, isPending: false, error: null }),
}));
vi.mock('../../features/auth/store/useAuthStore', () => ({
  useAuthStore: (selector: (value: unknown) => unknown) => selector({ user: { id: 'owner', rol: 'ESTUDIANTE' } }),
}));
vi.mock('../../shared/auth/useActivePerspective', () => ({ useActivePerspective: () => 'ESTUDIANTE' }));
vi.mock('../../features/projects/hooks/useProjectsQueries', () => ({ useProject: () => ({ data: { creadoPorId: 'owner' } }) }));

beforeEach(() => {
  vi.clearAllMocks();
  state.list.mockReturnValue([]);
  state.create.mockImplementation((_payload: JourneyMapContenido, options: { onSuccess: () => void }) => options.onSuccess());
});

function mostrar() {
  render(<RouterProvider router={createMemoryRouter([{
    path: '/', element: <Outlet context={{ proyectoId: 'p1' }} />,
    children: [{ index: true, element: <JourneyMapPage /> }],
  }])} />);
}

function siguiente(veces: number) {
  for (let i = 0; i < veces; i++) fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
}

describe('Journey Map — creación', () => {
  it('conserva la actividad en su fase al quitar otra fase, incluso después de reiniciar el formulario', () => {
    mostrar();
    for (let run = 0; run < 2; run++) {
      fireEvent.click(screen.getByRole('button', { name: '+ Nuevo Journey Map' }));
      fireEvent.change(screen.getByLabelText('Nombre del perfil de usuario'), { target: { value: 'Ana' } });
      fireEvent.change(screen.getByLabelText('Rol del usuario'), { target: { value: 'Solicitante' } });
      siguiente(2);
      fireEvent.click(screen.getByRole('button', { name: '+ Agregar fase' }));
      fireEvent.change(screen.getByLabelText('Actividades fase 4'), { target: { value: 'Solo en fase cuatro' } });
      fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar fase' })[0]);
      siguiente(3);
      fireEvent.click(screen.getByRole('button', { name: 'Guardar Journey Map' }));
      const payload = state.create.mock.calls[run][0] as JourneyMapContenido;
      expect(payload.fases.map((phase) => ({ nombre: phase.nombre, actividades: phase.actividades }))).toEqual([
        { nombre: 'Consideración', actividades: [] }, { nombre: 'Decisión', actividades: [] },
        { nombre: 'Fase 4', actividades: ['Solo en fase cuatro'] },
      ]);
    }
  });

  it('muestra un paso a la vez y deja Guardar solo en el último', () => {
    mostrar();
    fireEvent.click(screen.getByRole('button', { name: '+ Nuevo Journey Map' }));
    expect(screen.getByRole('heading', { name: 'Paso 1 de 6: Perfil de usuario' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar Journey Map' })).toBeNull();
    siguiente(5);
    expect(screen.getByRole('heading', { name: 'Paso 6 de 6: Evidencia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar Journey Map' })).toBeInTheDocument();
  });

  it('mantiene Guardar inactivo hasta tener nombre y rol y explica por qué', () => {
    mostrar();
    fireEvent.click(screen.getByRole('button', { name: '+ Nuevo Journey Map' }));
    siguiente(5);
    expect(screen.getByRole('button', { name: 'Guardar Journey Map' })).toBeDisabled();
    expect(screen.getByText('Falta el nombre y el rol de la persona (paso 1).')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nombre del perfil de usuario'), { target: { value: 'Ana' } });
    expect(screen.getByRole('button', { name: 'Guardar Journey Map' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Rol del usuario'), { target: { value: 'Solicitante' } });
    expect(screen.getByRole('button', { name: 'Guardar Journey Map' })).toBeEnabled();
    expect(screen.queryByText('Falta el nombre y el rol de la persona (paso 1).')).toBeNull();
  });

  it('el anillo de avance sube al completar el perfil', () => {
    mostrar();
    fireEvent.click(screen.getByRole('button', { name: '+ Nuevo Journey Map' }));
    expect(screen.getByRole('img', { name: '1 de 4' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nombre del perfil de usuario'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Rol del usuario'), { target: { value: 'Solicitante' } });
    expect(screen.getByRole('img', { name: '2 de 4' })).toBeInTheDocument();
  });
});

const FASE = { nombre: 'Descubrimiento', actividades: [], touchpoints: [], pensamientos: [], emocion: 'Neutral', dificultades: [], ganancias: [], oportunidades: [] };
const journey = {
  id: 'j1', version: 1,
  contenido: {
    perfilUsuario: { id: 'u1', nombre: 'Ana Pérez', rol: 'Solicitante' },
    objetivo: 'Renovar un préstamo', eventoInicio: 'Recibe un aviso', evidencia: [],
    fases: [FASE, { ...FASE, nombre: 'Consideración' }, { ...FASE, nombre: 'Decisión' }],
  },
} as never;

describe('Journey Map — esqueleto estándar', () => {
  it('pone el botón primario de nuevo en la cabecera y no repite el título', () => {
    mostrar();
    const nuevo = screen.getByRole('button', { name: '+ Nuevo Journey Map' });
    expect(nuevo).toHaveClass('primary');
    expect(nuevo.closest('.page-head')).not.toBeNull();
    expect(nuevo.closest('.panel-head')).toBeNull();
    expect(screen.getAllByRole('heading', { name: 'Journey Maps' })).toHaveLength(1);
    expect(screen.queryByText('Artefactos versionados')).toBeNull();
  });

  it('con el formulario abierto el botón pasa a Cancelar secundario y el proceso queda a nivel de página', () => {
    mostrar();
    fireEvent.click(screen.getByRole('button', { name: '+ Nuevo Journey Map' }));
    const cancelar = screen.getByRole('button', { name: 'Cancelar' });
    expect(cancelar).toHaveClass('secondary');
    expect(cancelar.closest('.page-head')).not.toBeNull();
    const proceso = screen.getByRole('region', { name: 'Proceso del Journey Map' });
    expect(proceso.closest('form')).toBeNull();
    expect(screen.getAllByRole('region', { name: 'Proceso del Journey Map' })).toHaveLength(1);
  });

  it('oculta la lista mientras el formulario está abierto', () => {
    state.list.mockReturnValue([journey]);
    mostrar();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '+ Nuevo Journey Map' }));
    expect(screen.queryByText('Ana Pérez')).toBeNull();
  });
});

describe('Journey Map: lista estándar', () => {
  it('muestra el título con contador y Consultar secundario en la cabecera de la tarjeta', () => {
    state.list.mockReturnValue([journey]);
    mostrar();
    expect(screen.getByRole('heading', { name: 'Journey Maps del proyecto' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Journey Maps del proyecto' }).closest('.technique-list-head')?.textContent).toContain('1');
    const consultar = screen.getByRole('button', { name: 'Consultar' });
    expect(consultar).toHaveClass('secondary');
    expect(consultar.closest('.technique-item-actions')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).toBeNull();
  });

  it('Consultar abre el detalle y cambia a Cerrar', () => {
    state.list.mockReturnValue([journey]);
    mostrar();
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));
    expect(screen.getByRole('heading', { name: 'Detalle del Journey Map' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('heading', { name: 'Detalle del Journey Map' })).toBeNull();
  });

  it('sin Journey Maps muestra el vacío estándar y no el encabezado de lista', () => {
    mostrar();
    expect(screen.getByText('No hay Journey Maps todavía')).toBeInTheDocument();
    expect(screen.getByText('No hay Journey Maps todavía').closest('.technique-empty')).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'Journey Maps del proyecto' })).toBeNull();
  });
});

