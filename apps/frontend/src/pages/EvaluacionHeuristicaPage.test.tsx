import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { EvaluacionHeuristicaLegacyPage as EvaluacionHeuristicaPage } from './EvaluacionHeuristicaPage';

const api = vi.hoisted(() => ({
  listarSesionesHeuristicas: vi.fn(),
  obtenerSesionHeuristica: vi.fn(),
  crearSesionHeuristica: vi.fn(),
  registrarHallazgo: vi.fn(),
  actualizarHallazgo: vi.fn(),
  eliminarHallazgo: vi.fn(),
  finalizarSesionHeuristica: vi.fn(),
  subirEvidencia: vi.fn(),
  obtenerEvidenciaBlob: vi.fn(),
}));
const confirmar = vi.hoisted(() => vi.fn());
const exportarPdf = vi.hoisted(() => vi.fn());

vi.mock('../features/evaluacion-heuristica/api/evaluacion-heuristica.api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...api,
}));
vi.mock('../features/evaluacion-heuristica/heuristica-pdf', () => ({ exportarSesionHeuristicaPdf: exportarPdf }));
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
  vi.resetAllMocks();
  confirmar.mockResolvedValue(true);
  exportarPdf.mockResolvedValue({ sinCaptura: 0 });
  api.listarSesionesHeuristicas.mockResolvedValue([sesion()]);
  api.obtenerSesionHeuristica.mockResolvedValue(sesion());
  api.obtenerEvidenciaBlob.mockRejectedValue(new Error('Sin miniatura en esta prueba'));
});

describe('EvaluacionHeuristicaPage', () => {
  it('conserva el texto escrito mientras se sube una captura', async () => {
    let finish!: (value: { id: string }) => void;
    api.subirEvidencia.mockReturnValue(new Promise<{ id: string }>(resolve => { finish = resolve; }));
    renderPage();
    await abrirPrimeraSesion();
    const title = screen.getByLabelText(/título del hallazgo/i);
    await userEvent.type(title, 'Título inicial');
    await userEvent.upload(screen.getByLabelText(/captura de pantalla/i), new File(['png'], 'captura.png', { type: 'image/png' }));
    await userEvent.clear(title);
    await userEvent.type(title, 'Título escrito durante la subida');
    finish({ id: 'captura' });
    await screen.findByRole('button', { name: 'Quitar' });
    expect(title).toHaveValue('Título escrito durante la subida');
  });

  it('confirma antes de abandonar un borrador y permite conservarlo o descartarlo', async () => {
    renderPage();
    await abrirPrimeraSesion();
    await userEvent.type(screen.getByLabelText(/título del hallazgo/i), 'Borrador pendiente');
    confirmar.mockResolvedValueOnce(false);
    await userEvent.click(screen.getByRole('button', { name: '← Evaluaciones' }));
    expect(confirmar).toHaveBeenCalled();
    expect(screen.getByLabelText(/título del hallazgo/i)).toHaveValue('Borrador pendiente');
    await userEvent.click(screen.getByRole('button', { name: '← Evaluaciones' }));
    await abrirPrimeraSesion();
    expect(screen.getByLabelText(/título del hallazgo/i)).toHaveValue('');
  });

  it('conserva una edición al cancelar el descarte', async () => {
    api.obtenerSesionHeuristica.mockResolvedValue(sesion({ resultado: [hallazgo({ id: 'a', titulo: 'Grave' })] }));
    renderPage();
    await abrirPrimeraSesion();
    await userEvent.click(screen.getByRole('button', { name: /editar hallazgo: grave/i }));
    const form = screen.getByRole('form', { name: 'Editar hallazgo' });
    await userEvent.type(within(form).getByLabelText(/título del hallazgo/i), ' modificado');
    confirmar.mockResolvedValueOnce(false);
    await userEvent.click(within(form).getByRole('button', { name: 'Cancelar' }));
    expect(within(screen.getByRole('form', { name: 'Editar hallazgo' })).getByLabelText(/título del hallazgo/i)).toHaveValue('Grave modificado');
  });

  it('no finaliza la sesión cuando se decide conservar el borrador', async () => {
    renderPage();
    await abrirPrimeraSesion();
    await userEvent.type(screen.getByLabelText(/título del hallazgo/i), 'Borrador pendiente');
    confirmar.mockResolvedValueOnce(false);
    await userEvent.click(screen.getByRole('button', { name: /finalizar evaluación/i }));
    expect(confirmar).toHaveBeenCalledWith(expect.stringContaining('sin guardar'), expect.any(Object));
    expect(api.finalizarSesionHeuristica).not.toHaveBeenCalled();
  });

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

describe('EvaluacionHeuristicaPage · resumen y PDF', () => {
  const conHallazgos = () => sesion({
    resultado: [
      hallazgo({ id: 'a', severidad: 4, heuristicaId: 'H4' }),
      hallazgo({ id: 'b', severidad: 3, heuristicaId: 'H4', evidencia: null }),
      hallazgo({ id: 'c', severidad: 1, heuristicaId: 'H1' }),
    ],
  });

  it('muestra críticos, promedio, sin evidencia y el desglose por heurística', async () => {
    api.obtenerSesionHeuristica.mockResolvedValue(conHallazgos());
    renderPage();
    await abrirPrimeraSesion();
    const stats = screen.getByText('Mayores o catastróficos').closest('div') as HTMLElement;
    expect(within(stats).getByText('2')).toBeInTheDocument();
    const prom = screen.getByText('Severidad promedio').closest('div') as HTMLElement;
    expect(within(prom).getByText('2,7')).toBeInTheDocument();
    const barras = screen.getByRole('list', { name: 'Hallazgos por heurística' });
    const filas = within(barras).getAllByRole('listitem').map((li) => li.textContent);
    expect(filas[0]).toContain('H4 · Consistencia y estándares');
    expect(filas[0]).toContain('2');
    expect(filas[1]).toContain('H1 · Visibilidad del estado del sistema');
  });

  it('sin hallazgos no muestra el desglose', async () => {
    renderPage();
    await abrirPrimeraSesion();
    expect(screen.queryByRole('list', { name: 'Hallazgos por heurística' })).not.toBeInTheDocument();
  });

  it('descarga el PDF de la sesión abierta y bloquea el botón mientras se genera', async () => {
    api.obtenerSesionHeuristica.mockResolvedValue(conHallazgos());
    let terminar!: (v: { sinCaptura: number }) => void;
    exportarPdf.mockReturnValue(new Promise((resolve) => { terminar = resolve; }));
    renderPage();
    await abrirPrimeraSesion();
    await userEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }));
    expect(exportarPdf).toHaveBeenCalledWith('p1', expect.objectContaining({ id: 's1' }));
    expect(await screen.findByRole('button', { name: 'Generando PDF…' })).toBeDisabled();
    terminar({ sinCaptura: 0 });
    expect(await screen.findByRole('button', { name: 'Descargar PDF' })).toBeEnabled();
  });

  it('avisa si el PDF falla y deja reintentar', async () => {
    api.obtenerSesionHeuristica.mockResolvedValue(conHallazgos());
    exportarPdf.mockRejectedValueOnce(new Error('Sin memoria'));
    const avisos: string[] = [];
    const escuchar = (e: Event) => avisos.push((e as CustomEvent<{ message: string }>).detail.message);
    window.addEventListener('app:toast', escuchar);
    renderPage();
    await abrirPrimeraSesion();
    await userEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }));
    await waitFor(() => expect(avisos).toContain('Sin memoria'));
    expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeEnabled();
    window.removeEventListener('app:toast', escuchar);
  });
});
