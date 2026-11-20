import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { PdfContentPicker } from './PdfContentPicker';

it('emite las partes marcadas y conserva las demás', async () => {
  const onChange = vi.fn();
  const options = [{ id: 'perfil', label: 'Perfil' }, { id: 'detalle', label: 'Detalle' }];
  const { rerender } = render(<PdfContentPicker legend="Qué incluir" opciones={options} seleccion={['perfil']} onChange={onChange} />);
  await userEvent.click(screen.getByRole('checkbox', { name: 'Detalle' }));
  expect(onChange).toHaveBeenLastCalledWith(['perfil', 'detalle']);
  rerender(<PdfContentPicker legend="Qué incluir" opciones={options} seleccion={['perfil', 'detalle']} onChange={onChange} />);
  await userEvent.click(screen.getByRole('checkbox', { name: 'Perfil' }));
  expect(onChange).toHaveBeenLastCalledWith(['detalle']);
});
