import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardSortingEntry } from './CardSortingEntry';

function Harness({ defaultMode }: { defaultMode: 'uno' | 'lista' }) {
  const [value, setValue] = useState('');
  return (
    <>
      <CardSortingEntry
        title="Tarjetas"
        singular="tarjeta"
        plural="tarjetas"
        value={value}
        onChange={setValue}
        max={20}
        defaultMode={defaultMode}
        rules={['Una por línea.']}
        example="x"
        addPlaceholder="y"
      />
      <output data-testid="valor">{value}</output>
    </>
  );
}

describe('CardSortingEntry', () => {
  it('modo lista: previsualiza, agrega el bloque y vacía el campo', async () => {
    render(<Harness defaultMode="lista" />);
    const area = screen.getByLabelText('Pegar lista de tarjetas');
    await userEvent.type(area, 'A{Enter}B{Enter}C');
    expect(screen.getByTestId('cs-paste-preview-tarjetas')).toHaveTextContent('3 por agregar');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar 3 tarjetas' }));
    expect(area).toHaveValue('');
    expect(screen.getByTestId('valor')).toHaveTextContent('A B C');
    expect(screen.getByText('3 tarjetas agregadas.')).toBeInTheDocument();
  });

  it('modo de a una: Enter agrega y limpia el campo', async () => {
    render(<Harness defaultMode="uno" />);
    const input = screen.getByLabelText('Agregar tarjeta');
    await userEvent.type(input, 'Becas{Enter}');
    expect(input).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Quitar Becas' })).toBeInTheDocument();
  });

  it('los chips sobreviven al cambiar de modo', async () => {
    render(<Harness defaultMode="uno" />);
    await userEvent.type(screen.getByLabelText('Agregar tarjeta'), 'Becas{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Pegar lista' }));
    expect(screen.getByRole('button', { name: 'Quitar Becas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pegar lista' })).toHaveAttribute('aria-pressed', 'true');
  });
});
