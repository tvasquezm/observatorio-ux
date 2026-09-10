import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProfesorSalasPage } from './ProfesorSalasPage';

const api = vi.hoisted(() => ({
  getSalas: vi.fn(),
  createSala: vi.fn(),
  updateSala: vi.fn(),
}));

vi.mock('../api/salas.api', () => api);

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  api.getSalas.mockResolvedValue([
    {
      id: 'sala-1',
      nombre: 'Sala 4',
      periodo: '2026-2',
      instrucciones: 'Revisión semanal',
      fechaInicio: '2026-09-10T12:00:00.000Z',
      fechaFin: '2026-12-10T12:00:00.000Z',
      createdAt: '2026-09-01T12:00:00.000Z',
    },
  ]);
  api.updateSala.mockResolvedValue({ id: 'sala-1' });
});

describe('ProfesorSalasPage — edición de sala', () => {
  it('precarga y guarda un nuevo rango de fechas para una sala existente', async () => {
    render(
      <MemoryRouter>
        <ProfesorSalasPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Editar sala Sala 4' }));

    expect(screen.getByRole('heading', { name: 'Editar sala' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de la sala')).toHaveValue('Sala 4');
    expect(screen.getByLabelText('Inicio')).not.toHaveValue('');
    expect(screen.getByLabelText('Término')).not.toHaveValue('');

    const nuevaFechaInicio = '2026-09-15T10:00';
    const nuevaFechaFin = '2026-12-15T18:00';
    fireEvent.change(screen.getByLabelText('Inicio'), { target: { value: nuevaFechaInicio } });
    fireEvent.change(screen.getByLabelText('Término'), { target: { value: nuevaFechaFin } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(api.updateSala).toHaveBeenCalledWith('sala-1', {
        nombre: 'Sala 4',
        periodo: '2026-2',
        instrucciones: 'Revisión semanal',
        fechaInicio: new Date(nuevaFechaInicio).toISOString(),
        fechaFin: new Date(nuevaFechaFin).toISOString(),
      });
    });
    expect(api.createSala).not.toHaveBeenCalled();
  });
});
