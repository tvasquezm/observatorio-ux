import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EvidenciaEditor } from './EvidenciaEditor';

const api = vi.hoisted(() => ({ cargarEvidencia: vi.fn(), subirEvidenciaFlujo: vi.fn(), guardarAnotaciones: vi.fn() }));
vi.mock('./evidencia.api', () => api);
const meta = { id: 'cap1', evaluacionId: 'ev1', autorId: 'u1', mimeType: 'image/png', tamano: 5, anotaciones: [], revision: 0, createdAt: '2026-10-09' };
function abrir(editable = true, onPendingChange = vi.fn()) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <EvidenciaEditor proyectoId="p1" evaluacionId="ev1" evidenciaIds={['cap1']} editable={editable} onChange={vi.fn()} onPendingChange={onPendingChange} />
  </QueryClientProvider>);
}
beforeEach(() => {
  vi.resetAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:captura'), configurable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
  api.cargarEvidencia.mockResolvedValue({ meta, blob: new Blob(['png'], { type: 'image/png' }) });
  api.guardarAnotaciones.mockImplementation(async (_p, _e, _i, anotaciones, revision) => ({ ...meta, anotaciones, revision: revision + 1 }));
});
describe('EvidenciaEditor', () => {
  it('anota por teclado, permite deshacer y guarda separado de la imagen original', async () => {
    const pending = vi.fn();
    abrir(true, pending);
    await screen.findByAltText('Captura de evidencia');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar anotación' }));
    expect(screen.getByLabelText('Anotaciones de la captura')).toHaveTextContent('Rectángulo');
    expect(pending).toHaveBeenLastCalledWith(true);
    await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(screen.queryByRole('button', { name: 'Eliminar anotación 1' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Agregar anotación' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar anotaciones' }));
    expect(api.guardarAnotaciones).toHaveBeenCalledWith('p1', 'ev1', 'cap1', [expect.objectContaining({ tipo: 'rectangulo', x: 0.1, y: 0.1 })], 0);
    await screen.findByText('Anotaciones guardadas.');
    expect(api.subirEvidenciaFlujo).not.toHaveBeenCalled();
  });
  it('conserva las anotaciones cuando falla el guardado y permite reintentar', async () => {
    api.guardarAnotaciones.mockRejectedValueOnce(new Error('Sin conexión'));
    abrir();
    await screen.findByAltText('Captura de evidencia');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar anotación' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar anotaciones' }));
    await screen.findByText('Sin conexión');
    expect(screen.getByRole('button', { name: 'Eliminar anotación 1' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar anotaciones' }));
    await screen.findByText('Anotaciones guardadas.');
  });
  it('solo lectura permite alternar el original pero no editar ni subir', async () => {
    abrir(false);
    await screen.findByAltText('Captura de evidencia');
    expect(screen.queryByRole('button', { name: 'Agregar anotación' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Adjuntar captura')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Mostrar imagen original' }));
  });
  it('conserva el borrador y su revisión ante conflicto con otra pestaña', async () => {
    api.guardarAnotaciones.mockRejectedValue(new Error('La captura cambió. Recupera las anotaciones guardadas.'));
    abrir();
    await screen.findByAltText('Captura de evidencia');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar anotación' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar anotaciones' }));
    await screen.findByText('La captura cambió. Recupera las anotaciones guardadas.');
    expect(screen.getByRole('button', { name: 'Eliminar anotación 1' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar anotaciones' }));
    expect(api.guardarAnotaciones).toHaveBeenLastCalledWith('p1', 'ev1', 'cap1', expect.any(Array), 0);
  });
});
