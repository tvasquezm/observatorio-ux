import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { ExportReportDialog } from './ExportReportDialog';

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  exportPdf: vi.fn(),
  lienzos: vi.fn(),
}));
vi.mock('../projects/api/projects.api', () => ({ listProjects: async () => [{ id: 'p1', nombre: 'Mi proyecto' }] }));
vi.mock('./report-data', async original => ({
  ...await original<typeof import('./report-data')>(),
  loadProjectReport: mocks.load,
  listarLienzos: mocks.lienzos,
}));
vi.mock('../../shared/utils/pdf', () => ({ exportarReportePdf: mocks.exportPdf }));

beforeEach(() => {
  mocks.load.mockReset(); mocks.exportPdf.mockReset();
  localStorage.clear(); sessionStorage.clear();
  mocks.lienzos.mockResolvedValue({ personas: [{ id: 'p-ana', nombre: 'Ana' }, { id: 'p-beto', nombre: 'Beto' }], journey: [], momentos: [], cards: [], heuristica: [] });
});

async function abrir(projectId: string | undefined = 'p1') {
  render(<QueryClientProvider client={new QueryClient()}><ExportReportDialog projectId={projectId} onClose={vi.fn()} /></QueryClientProvider>);
  const dialog = within(screen.getByRole('dialog', { name: 'Descargar PDF' }));
  await dialog.findByRole('option', { name: 'Mi proyecto' });
  return dialog;
}

it('exporta las partes marcadas y omite la técnica si se desmarcan todas sus partes', async () => {
  const report = { project: { id: 'p1' } };
  mocks.load.mockResolvedValue(report);
  const dialog = await abrir();
  await userEvent.click(dialog.getByRole('button', { name: 'Elegir apartados de Personas' }));
  const personas = within(dialog.getByRole('group', { name: 'Qué incluir de Personas' }));
  await userEvent.click(personas.getByRole('checkbox', { name: 'Perfil y descripción' }));
  await userEvent.click(dialog.getByRole('button', { name: 'Elegir apartados de Momentos Críticos' }));
  const momentos = within(dialog.getByRole('group', { name: 'Qué incluir de Momentos Críticos' }));
  for (const checkbox of momentos.getAllByRole('checkbox')) await userEvent.click(checkbox);
  expect(dialog.getByRole('status')).toHaveTextContent('partes sin incluir');
  await userEvent.click(dialog.getByRole('button', { name: 'Descargar PDF' }));
  await waitFor(() => expect(mocks.exportPdf).toHaveBeenCalledWith(report));
  expect(mocks.load).toHaveBeenCalledWith('p1', ['personas', 'journey', 'cards', 'heuristica'], {
    personas: ['visual', 'necesidades', 'validacion'], momentos: [],
  }, {});
});

it('F39: solo una técnica abierta a la vez; Listo la pliega, deja el resumen y reabrir conserva la selección', async () => {
  const dialog = await abrir();
  expect(dialog.queryByRole('group', { name: 'Qué incluir de Personas' })).toBeNull();
  const toggle = dialog.getByRole('button', { name: 'Elegir apartados de Personas' });
  await userEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await userEvent.click(within(dialog.getByRole('group', { name: 'Qué incluir de Personas' })).getByRole('checkbox', { name: 'Perfil y descripción' }));
  await userEvent.click(dialog.getByRole('button', { name: 'Elegir apartados de Journey Map' }));
  expect(dialog.queryByRole('group', { name: 'Qué incluir de Personas' })).toBeNull();
  await userEvent.click(dialog.getByRole('button', { name: 'Listo: apartados de Journey Map' }));
  expect(dialog.queryByRole('group', { name: 'Qué incluir de Journey Map' })).toBeNull();
  expect(dialog.getByRole('button', { name: 'Elegir apartados de Journey Map' })).toHaveFocus();
  expect(dialog.getByText(/3 de 4 apartados/)).toBeInTheDocument();
  expect(dialog.getAllByText('Todo · 9 de 9 apartados').length).toBeGreaterThan(0);
  await userEvent.click(dialog.getByRole('button', { name: 'Elegir apartados de Personas' }));
  expect(within(dialog.getByRole('group', { name: 'Qué incluir de Personas' })).getByRole('checkbox', { name: 'Perfil y descripción' })).not.toBeChecked();
});

it('F39: desmarcar una técnica la excluye y pliega; marcarla la despliega; Informe completo y Quitar todas siguen funcionando', async () => {
  const dialog = await abrir();
  await userEvent.click(dialog.getByRole('button', { name: 'Elegir apartados de Personas' }));
  await userEvent.click(dialog.getByRole('checkbox', { name: 'Incluir Personas' }));
  expect(dialog.queryByRole('group', { name: 'Qué incluir de Personas' })).toBeNull();
  expect(dialog.getByText('No se incluye')).toBeInTheDocument();
  expect(dialog.getByRole('status')).toHaveTextContent('4 de 5 técnicas seleccionadas');
  await userEvent.click(dialog.getByRole('checkbox', { name: 'Incluir Personas' }));
  expect(dialog.getByRole('group', { name: 'Qué incluir de Personas' })).toBeInTheDocument();
  await userEvent.click(dialog.getByRole('button', { name: 'Quitar todas' }));
  expect(dialog.getByRole('status')).toHaveTextContent('Selecciona al menos una técnica para descargar.');
  expect(dialog.getByRole('button', { name: 'Descargar PDF' })).toBeDisabled();
  await userEvent.click(dialog.getByRole('button', { name: /^Informe completo/ }));
  expect(dialog.getByRole('status')).toHaveTextContent('5 de 5 técnicas seleccionadas');
  expect(dialog.getByRole('button', { name: 'Descargar PDF' })).toBeEnabled();
});

it('permite elegir cuáles lienzos de una técnica van al PDF (por ejemplo, una de dos personas)', async () => {
  mocks.load.mockResolvedValue({ project: { id: 'p1' } });
  const dialog = await abrir();
  await userEvent.click(dialog.getByRole('button', { name: 'Elegir apartados de Personas' }));
  const cuales = within(await dialog.findByRole('group', { name: 'Cuáles de Personas' }));
  await userEvent.click(cuales.getByRole('checkbox', { name: 'Beto' }));
  expect(dialog.getByText(/^1 de 2 · /)).toBeInTheDocument();
  await userEvent.click(dialog.getByRole('button', { name: 'Descargar PDF' }));
  await waitFor(() => expect(mocks.load).toHaveBeenCalledWith('p1', expect.any(Array), {}, { personas: ['p-ana'] }));
});

it('fuera de un proyecto preselecciona el único proyecto disponible', async () => {
  const dialog = await abrir(undefined);
  await waitFor(() => expect(dialog.getByRole('combobox', { name: 'Proyecto' })).toHaveValue('p1'));
});

it('la plantilla Resumen ejecutivo deja gráficos y resúmenes, y Solo hallazgos deja dos técnicas', async () => {
  mocks.load.mockResolvedValue({ project: { id: 'p1' } });
  const dialog = await abrir();
  await userEvent.click(dialog.getByRole('button', { name: /^Resumen ejecutivo/ }));
  expect(dialog.getByRole('button', { name: /^Resumen ejecutivo/ })).toHaveAttribute('aria-pressed', 'true');
  expect(dialog.getByRole('status')).toHaveTextContent('5 de 5 técnicas seleccionadas · 10 apartados');
  await userEvent.click(dialog.getByRole('button', { name: /^Solo hallazgos/ }));
  expect(dialog.getByRole('status')).toHaveTextContent('2 de 5 técnicas seleccionadas · 5 apartados');
  await userEvent.click(dialog.getByRole('button', { name: 'Descargar PDF' }));
  await waitFor(() => expect(mocks.load).toHaveBeenCalledWith('p1', ['momentos', 'heuristica'], {}, {}));
});

it('recuerda la última elección del proyecto y convierte apartados antiguos', async () => {
  localStorage.setItem('observatorio-ux-export:anonymous:p1', JSON.stringify({ selection: ['cards'], partes: { cards: ['resultados'] } }));
  mocks.load.mockResolvedValue({ project: { id: 'p1' } });
  const dialog = await abrir();
  await waitFor(() => expect(dialog.getByRole('status')).toHaveTextContent('1 de 5 técnicas seleccionadas · 2 apartados'));
  await userEvent.click(dialog.getByRole('button', { name: 'Descargar PDF' }));
  await waitFor(() => expect(mocks.load).toHaveBeenCalledWith('p1', ['cards'], { cards: ['tarjetas', 'categorias'] }, {}));
  expect(JSON.parse(localStorage.getItem('observatorio-ux-export:anonymous:p1')!).partes.cards).toEqual(['tarjetas', 'categorias']);
});
