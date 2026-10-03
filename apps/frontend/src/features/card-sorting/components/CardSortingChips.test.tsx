import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardSortingAddOne, CardSortingChips } from './CardSortingChips';
import { analizarEntrada } from '../card-sorting-input';

describe('CardSortingAddOne', () => {
  it('Enter agrega, limpia el campo y no envía el formulario', async () => {
    const onAdd = vi.fn();
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    const { container } = render(
      <form onSubmit={onSubmit as never}>
        <CardSortingAddOne label="Agregar tarjeta" placeholder="x" onAdd={onAdd} />
      </form>,
    );
    const input = screen.getByLabelText('Agregar tarjeta');
    await userEvent.type(input, 'Biblioteca{Enter}');
    expect(onAdd).toHaveBeenCalledWith('Biblioteca');
    expect(input).toHaveValue('');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(container.querySelector('form')).toBeTruthy();
  });

  it('el botón queda deshabilitado con el campo vacío', () => {
    render(<CardSortingAddOne label="Agregar tarjeta" placeholder="x" onAdd={() => {}} />);
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeDisabled();
  });
});

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
