import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardSortingChips } from './CardSortingChips';
import { analizarEntrada } from '../card-sorting-input';

describe('CardSortingChips', () => {
  it('no muestra nada sin elementos', () => {
    const { container } = render(
      <CardSortingChips info={analizarEntrada('', 10)} max={10} noun="tarjetas" onRemove={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('marca duplicadas y pasadas de largo, y permite quitar por índice', async () => {
    const onRemove = vi.fn();
    const info = analizarEntrada('Becas\nbecas\nMuy largo de verdad', 10);
    render(<CardSortingChips info={info} max={10} noun="tarjetas" onRemove={onRemove} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0].classList.contains('error')).toBe(true);
    expect(items[1].classList.contains('error')).toBe(true);
    expect(items[2].classList.contains('error')).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Quitar becas' }));
    expect(onRemove).toHaveBeenCalledWith(1);
  });
});
