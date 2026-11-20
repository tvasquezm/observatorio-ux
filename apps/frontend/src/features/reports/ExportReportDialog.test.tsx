import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { ExportReportDialog } from './ExportReportDialog';

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  exportPdf: vi.fn(),
}));
vi.mock('../projects/api/projects.api', () => ({ listProjects: async () => [{ id: 'p1', nombre: 'Mi proyecto' }] }));
vi.mock('./report-data', async original => ({
  ...await original<typeof import('./report-data')>(),
  loadProjectReport: mocks.load,
}));
vi.mock('../../shared/utils/pdf', () => ({ exportarReportePdf: mocks.exportPdf }));

it('exporta las partes marcadas y omite la técnica si se desmarcan todas sus partes', async () => {
  const report = { project: { id: 'p1' } };
  mocks.load.mockResolvedValue(report);
  render(<QueryClientProvider client={new QueryClient()}><ExportReportDialog projectId="p1" onClose={vi.fn()} /></QueryClientProvider>);
  const dialog = within(screen.getByRole('dialog', { name: 'Descargar PDF' }));
  await dialog.findByRole('option', { name: 'Mi proyecto' });
  const personas = within(dialog.getByRole('group', { name: 'Qué incluir de Personas' }));
  await userEvent.click(personas.getByRole('checkbox', { name: 'Perfil y descripción' }));
  const momentos = within(dialog.getByRole('group', { name: 'Qué incluir de Momentos Críticos' }));
  for (const checkbox of momentos.getAllByRole('checkbox')) await userEvent.click(checkbox);
  expect(dialog.getByRole('status')).toHaveTextContent('partes sin incluir');
  await userEvent.click(dialog.getByRole('button', { name: 'Descargar PDF' }));
  await waitFor(() => expect(mocks.exportPdf).toHaveBeenCalledWith(report));
  expect(mocks.load).toHaveBeenCalledWith('p1', ['personas', 'journey', 'cards', 'heuristica'], {
    personas: ['necesidades', 'validacion'], momentos: [],
  });
});
