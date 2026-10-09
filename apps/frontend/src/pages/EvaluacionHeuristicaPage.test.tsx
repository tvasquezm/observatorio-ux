import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { EvaluacionHeuristicaPage } from './EvaluacionHeuristicaPage';

const api = vi.hoisted(() => ({
  listarSesionesHeuristicas: vi.fn(),
  obtenerSesionHeuristica: vi.fn(),
  crearSesionHeuristica: vi.fn(),
  registrarHallazgo: vi.fn(),
  actualizarHallazgo: vi.fn(),
  eliminarHallazgo: vi.fn(),
  finalizarSesionHeuristica: vi.fn(),
}));
const confirmar = vi.hoisted(() => vi.fn());

vi.mock('../features/evaluacion-heuristica/api/evaluacion-heuristica.api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...api,
}));
vi.mock('../shared/api/confirm', () => ({ useConfirm: () => confirmar, askConfirm: confirmar }));

const hallazgo = (over: Record<string, unknown>) => ({
  id: 'h',
  heuristicaId: 'H4',
  severidad: 2,
  titulo: 'Título',
  pantalla: 'Login',
  descripcion: 'Descripción del problema observado.',
  evidencia: 'Evidencia',
  recomendacion: 'Recomendación',
  responsable: { id: 'u1', nombre: 'Ana Evaluadora' },
  registradoEn: '2026-10-01T00:00:00.000Z',
  ...over,
});

const sesion = (over: Record<string, unknown> = {}) => ({
  id: 's1',
  proyectoId: 'p1',
  nombre: 'Portal de matrículas',
  estado: 'EN_PROGRESO',
  resultado: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  completadoAt: null,
  ...over,
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [{ path: '/', element: <Outlet context={{ proyectoId: 'p1' }} />, children: [{ index: true, element: <EvaluacionHeuristicaPage /> }] }],
    { initialEntries: ['/'] },
  );
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

async function abrirPrimeraSesion() {
  await userEvent.click(await screen.findByRole('button', { name: /continuar|ver/i }));
  await screen.findByText('Hallazgos registrados');
}

beforeEach(() => {
  vi.clearAllMocks();
  confirmar.mockResolvedValue(true);
  api.listarSesionesHeuristicas.mockResolvedValue([sesion()]);
  api.obtenerSesionHeuristica.mockResolvedValue(sesion());
});

describe('EvaluacionHeuristicaPage', () => {
  it('lista las evaluaciones previas y permite continuar una en progreso', async () => {
    renderPage();
    expect(await screen.findByText('Portal de matrículas')).toBeInTheDocument();
    await abrirPrimeraSesion();
    expect(api.obtenerSesionHeuristica).toHaveBeenCalledWith('p1', 's1');
  });

  it('crea una evaluación con nombre', async () => {
    api.crearSesionHeuristica.mockResolvedValue(sesion({ id: 's2', nombre: 'Nuevo sitio' }));
    api.obtenerSesionHeuristica.mockResolvedValue(sesion({ id: 's2', nombre: 'Nuevo sitio' }));
    renderPage();
    await userEvent.type(await screen.findByLabelText(/producto o sitio evaluado/i), 'Nuevo sitio');
    await userEvent.click(screen.getByRole('button', { name: /abrir nueva evaluación/i }));
    await waitFor(() => expect(api.crearSesionHeuristica).toHaveBeenCalledWith('p1', 'Nuevo sitio'));
    expect(await screen.findByRole('heading', { name: 'Nuevo sitio' })).toBeInTheDocument();
  });

  it('muestra los hallazgos por severidad desc con responsable y tolera hallazgos legados', async () => {
    api.obtenerSesionHeuristica.mockResolvedValue(
      sesion({
        resultado: [
          hallazgo({ id: 'a', titulo: 'Menor', severidad: 1 }),
          hallazgo({ id: 'b', titulo: 'Grave', severidad: 4 }),
          { id: 'c', heuristicaId: 'consistencia', severidad: 2, descripcion: 'Hallazgo legado sin campos nuevos', evidencia: null, recomendacion: null, registradoEn: '2026-09-01T00:00:00.000Z' },
        ],
      }),
    );
    renderPage();
    await abrirPrimeraSesion();
    const titulos = screen.getAllByRole('heading', { level: 3 }).map((n) => n.textContent);
    expect(titulos).toEqual(['Grave', 'Hallazgo legado sin campos nuevos', 'Menor']);
    expect(screen.getAllByText('Ana Evaluadora')).toHaveLength(2);
    expect(screen.getByText('Sin registrar')).toBeInTheDocument();
    // una vez en el resumen y otra en la tarjeta
    expect(screen.getAllByText('4 · Catastrófico')).toHaveLength(2);
  });


  it('filtra por severidad y permite quitar el filtro', async () => {
    api.obtenerSesionHeuristica.mockResolvedValue(
      sesion({ resultado: [hallazgo({ id: 'a', titulo: 'Menor', severidad: 1 }), hallazgo({ id: 'b', titulo: 'Grave', severidad: 4 })] }),
    );
    renderPage();
    await abrirPrimeraSesion();
    const filtros = within(screen.getByRole('group', { name: 'Filtros de hallazgos' }));
    await userEvent.selectOptions(filtros.getByLabelText('Severidad'), '4');
    expect(screen.getAllByRole('heading', { level: 3 }).map((n) => n.textContent)).toEqual(['Grave']);
    await userEvent.click(filtros.getByRole('button', { name: /quitar filtros/i }));
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2);
  });

  it('no envía un formulario incompleto y marca los campos', async () => {
    renderPage();
    await abrirPrimeraSesion();
    await userEvent.click(screen.getByRole('button', { name: /agregar hallazgo/i }));
    expect(api.registrarHallazgo).not.toHaveBeenCalled();
    expect(screen.getByText('Elige la heurística vulnerada.')).toBeInTheDocument();
    expect(screen.getByText('Propón una acción concreta.')).toBeInTheDocument();
  });

  it('envía el hallazgo completo al API', async () => {
    api.registrarHallazgo.mockResolvedValue(sesion());
    renderPage();
    await abrirPrimeraSesion();
    const form = screen.getByRole('form', { name: 'Nuevo hallazgo' });
    const q = within(form);
    await userEvent.selectOptions(q.getByLabelText(/heurística vulnerada/i), 'H4');
    await userEvent.type(q.getByLabelText(/título del hallazgo/i), 'Botón sin etiqueta');
    await userEvent.type(q.getByLabelText(/pantalla o elemento/i), 'Inscripción');
    await userEvent.type(q.getByLabelText(/descripción del problema/i), 'El botón de envío no tiene texto visible.');
    await userEvent.type(q.getByLabelText(/observación/i), 'Solo se ve un ícono.');
    await userEvent.type(q.getByLabelText(/recomendación de mejora/i), 'Agregar la etiqueta Enviar.');
    await userEvent.click(q.getByRole('button', { name: /agregar hallazgo/i }));
    await waitFor(() => expect(api.registrarHallazgo).toHaveBeenCalledTimes(1));
    expect(api.registrarHallazgo).toHaveBeenCalledWith('p1', 's1', expect.objectContaining({
      heuristicaId: 'H4', severidad: 2, titulo: 'Botón sin etiqueta', pantalla: 'Inscripción',
      evidencia: 'Solo se ve un ícono.', evidenciaUrl: null, evidenciaArchivoId: null,
      recomendacion: 'Agregar la etiqueta Enviar.',
    }));
  });

  it('elimina un hallazgo solo tras confirmar', async () => {
    api.obtenerSesionHeuristica.mockResolvedValue(sesion({ resultado: [hallazgo({ id: 'a', titulo: 'Grave', severidad: 4 })] }));
    api.eliminarHallazgo.mockResolvedValue(sesion());
    renderPage();
    await abrirPrimeraSesion();
    confirmar.mockResolvedValueOnce(false);
    await userEvent.click(screen.getByRole('button', { name: /eliminar hallazgo: grave/i }));
    expect(api.eliminarHallazgo).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /eliminar hallazgo: grave/i }));
    await waitFor(() => expect(api.eliminarHallazgo).toHaveBeenCalledWith('p1', 's1', 'a'));
  });

  it('una evaluación finalizada es de solo lectura', async () => {
    api.listarSesionesHeuristicas.mockResolvedValue([sesion({ estado: 'COMPLETADO' })]);
    api.obtenerSesionHeuristica.mockResolvedValue(
      sesion({ estado: 'COMPLETADO', resultado: [hallazgo({ id: 'a', titulo: 'Grave', severidad: 4 })] }),
    );
    renderPage();
    await abrirPrimeraSesion();
    expect(screen.queryByRole('form', { name: 'Nuevo hallazgo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /editar hallazgo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /finalizar evaluación/i })).not.toBeInTheDocument();
  });
});
