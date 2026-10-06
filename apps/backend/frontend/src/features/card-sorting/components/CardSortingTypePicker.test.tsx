import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardSortingTypePicker } from './CardSortingTypePicker';

describe('CardSortingTypePicker', () => {
  it('ofrece los 3 tipos como grupo de radios y marca el activo', () => {
    render(<CardSortingTypePicker value="CERRADO" onChange={() => {}} />);
    expect(screen.getByRole('group', { name: 'Tipo de estudio' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: /Cerrado/ })).toBeChecked();
  });

  it('avisa el tipo elegido', async () => {
    const onChange = vi.fn();
    render(<CardSortingTypePicker value="ABIERTO" onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /Híbrido/ }));
    expect(onChange).toHaveBeenCalledWith('HIBRIDO');
  });
});
