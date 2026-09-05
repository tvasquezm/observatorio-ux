// apps/frontend/src/pages/__tests__/MomentosCriticosPage.test.tsx
//
// Cubre los 3 casos de mayor riesgo identificados en docs/AUDIT_LOG.md
// (F1: lock 409 → readonly; MIN_INCIDENTES; agrupación de la matriz 3x3).
// Se mockea el módulo de hooks (useMomentosCriticosQueries), no el de api
// (momentos-criticos.api.ts): addIncidente/removeIncidente son funciones
// puras y se usan reales, sin necesidad de mockear fetch.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MomentosCriticosPage } from '../MomentosCriticosPage';
import { ArtifactsApiError } from '../../shared/api/artifacts.api';
import type { MomentosCriticosArtifact } from '../../features/momentos-criticos/api/momentos-criticos.api';

const hooks = vi.hoisted(() => ({
  useCriticalMoments: vi.fn(),
  useCreateCriticalMoment: vi.fn(),
  useUpdateCriticalMoment: vi.fn(),
  useDeleteCriticalMoment: vi.fn(),
  useLockCriticalMoment: vi.fn(),
  useUnlockCriticalMoment: vi.fn(),
}));

vi.mock('../../features/momentos-criticos/hooks/useMomentosCriticosQueries', () => hooks);

function mutationStub(overrides: Partial<{ mutate: (...args: any[]) => void; isPending: boolean; error: unknown }> = {}) {
  return { mutate: vi.fn(), isPending: false, error: null, ...overrides };
}

function renderPage() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/proyectos/p1/momentos-criticos']}>
        <Routes>
          <Route path="/proyectos/:proyectoId" element={<Outlet context={{ proyectoId: 'p1' }} />}>
            <Route path="momentos-criticos" element={<MomentosCriticosPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function momentoDePrueba(overrides: Partial<MomentosCriticosArtifact> = {}): MomentosCriticosArtifact {
  return {
    id: 'art-1',
    proyectoId: 'p1',
    tipo: 'MOMENTOS_CRITICOS',
    artefactoLogicoId: 'logico-1',
    version: 1,
    autorId: 'u1',
    createdAt: new Date().toISOString(),
    lockedById: null,
    lockedUntil: null,
    contenido: {
      perfilUsuario: { id: 'perfil-1', nombre: 'Ana', rol: 'Compradora frecuente' },
      incidentes: [
        {
          nombre: 'Checkout falla',
          descripcion: '',
          tipo: 'Negativo',
          impacto: 'Alto',
          frecuencia: 'Alta',
          causa: '',
          accionesSugeridas: [],
        },
      ],
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  hooks.useCriticalMoments.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
  hooks.useCreateCriticalMoment.mockReturnValue(mutationStub());
  hooks.useUpdateCriticalMoment.mockReturnValue(mutationStub());
  hooks.useDeleteCriticalMoment.mockReturnValue(mutationStub());
  hooks.useLockCriticalMoment.mockReturnValue(mutationStub());
  hooks.useUnlockCriticalMoment.mockReturnValue(mutationStub());
});

describe('MomentosCriticosPage — lock pesimista (F1, AUDIT_LOG.md)', () => {
  it('si acquireLock devuelve 409, el formulario pasa a solo lectura en vez de romperse', async () => {
    const momento = momentoDePrueba();
    hooks.useCriticalMoments.mockReturnValue({ data: [momento], isLoading: false, isError: false, error: null });
    hooks.useLockCriticalMoment.mockReturnValue(
      mutationStub({
        mutate: (_args, opts) => {
          opts?.onError?.(new ArtifactsApiError(409, 'Bloqueado por otro usuario.'));
        },
      }),
    );

    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }));

    expect(
      screen.getByText(/está bloqueado por otro usuario/i),
    ).toBeInTheDocument();

    // El fieldset que envuelve los campos del form debe quedar disabled.
    const nombreInput = screen.getByLabelText('Nombre del perfil de usuario');
    expect(nombreInput).toBeDisabled();
  });
});

describe('MomentosCriticosPage — mínimo de incidentes', () => {
  it('no permite quitar el último incidente (MomentosCriticosSchema exige mínimo 1)', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '+ Nuevo momento crítico' }));

    const botonQuitar = screen.getByRole('button', { name: 'Quitar incidente' });
    expect(botonQuitar).toBeDisabled();

    // Se agrega uno: ahora sí se puede quitar, hasta volver a quedar en 1.
    await userEvent.click(screen.getByRole('button', { name: '+ Agregar incidente' }));
    const botonesQuitar = screen.getAllByRole('button', { name: 'Quitar incidente' });
    expect(botonesQuitar).toHaveLength(2);
    expect(botonesQuitar[0]).not.toBeDisabled();

    await userEvent.click(botonesQuitar[0]);
    const botonFinal = screen.getByRole('button', { name: 'Quitar incidente' });
    expect(botonFinal).toBeDisabled();
  });
});

describe('MomentosCriticosPage — matriz 3x3', () => {
  it('agrupa cada incidente en la celda de impacto x frecuencia correcta', () => {
    const momento = momentoDePrueba({
      contenido: {
        perfilUsuario: { id: 'perfil-1', nombre: 'Ana', rol: 'Compradora frecuente' },
        incidentes: [
          { nombre: 'Incidente Alto-Alta', descripcion: '', tipo: 'Negativo', impacto: 'Alto', frecuencia: 'Alta', causa: '', accionesSugeridas: [] },
          { nombre: 'Incidente Bajo-Baja', descripcion: '', tipo: 'Positivo', impacto: 'Bajo', frecuencia: 'Baja', causa: '', accionesSugeridas: [] },
          { nombre: 'Incidente Medio-Media', descripcion: '', tipo: 'Negativo', impacto: 'Medio', frecuencia: 'Media', causa: '', accionesSugeridas: [] },
        ],
      },
    });
    hooks.useCriticalMoments.mockReturnValue({ data: [momento], isLoading: false, isError: false, error: null });

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Ver Matriz 3x3' }));

    const celdaAltoAlta = screen.getByTestId('celda-Alto-Alta');
    const celdaBajoBaja = screen.getByTestId('celda-Bajo-Baja');
    const celdaMedioMedia = screen.getByTestId('celda-Medio-Media');

    expect(within(celdaAltoAlta).getByText('Incidente Alto-Alta')).toBeInTheDocument();
    expect(within(celdaBajoBaja).getByText('Incidente Bajo-Baja')).toBeInTheDocument();
    expect(within(celdaMedioMedia).getByText('Incidente Medio-Media')).toBeInTheDocument();

    // Ninguno se filtra a una celda que no le corresponde.
    expect(within(celdaAltoAlta).queryByText('Incidente Bajo-Baja')).not.toBeInTheDocument();
    expect(within(celdaBajoBaja).queryByText('Incidente Alto-Alta')).not.toBeInTheDocument();
  });
});
