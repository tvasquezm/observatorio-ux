import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { analizarEntrada } from '../card-sorting-input';
import { CardSortingChips } from './CardSortingChips';
import userEvent from '@testing-library/user-event';

describe('estados de las tarjetas', () => {
  it('no muestra nada sin elementos', () => {
    const { container } = render(<CardSortingChips info={analizarEntrada('', 10)} max={10} noun="tarjetas" onRemove={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('marca duplicadas y pasadas de largo, y permite quitar por índice', async () => {
    const onRemove = vi.fn();
    render(<CardSortingChips info={analizarEntrada('Becas\nbecas\nMuy largo de verdad', 10)} max={10} noun="tarjetas" onRemove={onRemove} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    for (const item of items) expect(item.classList.contains('error')).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Quitar becas' }));
    expect(onRemove).toHaveBeenCalledWith(1);
  });
  it('explica los estados de error y advertencia sin depender del color', () => {
    render(<CardSortingChips info={analizarEntrada('Larguísima\nMedia\nMedia', 8, 5)} max={8} aviso={5} noun="tarjetas" onRemove={vi.fn()} />);
    expect(screen.getByText('Supera el límite')).toBeVisible();
    expect(screen.getAllByText('Repetida')).toHaveLength(2);
  });
  it('identifica las tarjetas cercanas al límite', () => {
    render(<CardSortingChips info={analizarEntrada('Mediana', 10, 5)} max={10} aviso={5} noun="tarjetas" onRemove={vi.fn()} />);
    expect(screen.getByText('Texto largo')).toBeVisible();
  });
});
