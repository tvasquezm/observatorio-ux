import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { Sala } from '../../salas/api/salas.api';
import { ProjectCreateForm } from './ProjectCreateForm';

const sala: Sala = {
  id: 's1', nombre: 'Sala 1', periodo: '2026-2', createdAt: '2026-10-08',
  permiteCreacionEquipos: false, limiteIntegrantesEquipo: null, permiteCreacionProyectos: true,
};

it.each([false, true])('explica la relación sala y proyecto con sala fija=%s', fija => {
  render(<ProjectCreateForm
    value={{ nombre: '', descripcion: '', salaId: fija ? sala.id : '' }}
    salas={[sala]}
    salaFija={fija ? sala : undefined}
    onChange={vi.fn()}
    onSubmit={vi.fn()}
    onCancel={vi.fn()}
    isPending={false}
  />);
  expect(screen.getByText('Un proyecto vive dentro de una sala y reúne las técnicas de una investigación.')).toBeVisible();
  expect(screen.getByLabelText('Sala')).toBeVisible();
});
