import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CardSortingAnalytics } from '../api/card-sorting.api';
import { CardSortingCardsView } from './CardSortingCardsView';
import { CardSortingCategoriesView } from './CardSortingCategoriesView';

const data = {
  participantesCount: 4,
  categorias: ['Servicios', 'Vida'],
  umbrales: { consenso: 50, muestraMinima: 15, muestraEstable: 30 },
  frecuenciaPorCategoria: [{ nombre: 'Servicios', count: 5, porcentaje: 80 }],
  porCarta: [
    { tarjeta: 'Becas', categoriasCount: 1, categorias: [{ nombre: 'Servicios', frecuencia: 3 }, { nombre: 'Vida', frecuencia: 1 }] },
    { tarjeta: 'Biblioteca', categoriasCount: 2, categorias: [{ nombre: 'Servicios', frecuencia: 2 }, { nombre: 'Vida', frecuencia: 2 }] },
  ],
  porCategoria: [
    { nombre: 'Servicios', cardsCount: 2, cartas: [{ tarjeta: 'Becas', frecuencia: 3 }, { tarjeta: 'Biblioteca', frecuencia: 2 }] },
    { nombre: 'Vida', cardsCount: 1, cartas: [{ tarjeta: 'Biblioteca', frecuencia: 2 }] },
  ],
} as unknown as CardSortingAnalytics;

describe('CardSortingCardsView', () => {
  it('muestra el resumen y filtra con "Solo sin consenso"', async () => {
    render(<CardSortingCardsView data={data} onCategoria={() => {}} />);
    expect(screen.getByTestId('cs-cards-summary')).toHaveTextContent('1 con consenso · 1 sin consenso');
    await userEvent.click(screen.getByLabelText('Solo sin consenso'));
    expect(screen.queryByTestId('cs-card-row-Becas')).toBeNull();
    expect(screen.getByTestId('cs-card-row-Biblioteca')).toBeTruthy();
  });

  it('busca por texto y avisa cuando nada coincide', async () => {
    render(<CardSortingCardsView data={data} onCategoria={() => {}} />);
    await userEvent.type(screen.getByLabelText('Buscar tarjeta'), 'zzz');
    expect(screen.getByText('Ninguna tarjeta coincide con el filtro.')).toBeTruthy();
  });

  it('la barra tiene alternativa en texto y las categorías son botones', async () => {
    const onCategoria = vi.fn();
    render(<CardSortingCardsView data={data} onCategoria={onCategoria} />);
    expect(screen.getByRole('img', { name: 'Becas: Servicios 75%, Vida 25%' })).toBeTruthy();
    await userEvent.click(within(screen.getByTestId('cs-card-row-Becas')).getByRole('button', { name: 'Vida' }));
    expect(onCategoria).toHaveBeenCalledWith('Vida');
  });
});

describe('CardSortingCategoriesView', () => {
  it('muestra el resumen, el uso y atenúa las tarjetas de bajo acuerdo', () => {
    render(<CardSortingCategoriesView data={data} onTarjeta={() => {}} />);
    expect(screen.getByTestId('cs-categories-summary')).toHaveTextContent('2 categorías · 1 con tarjetas de consenso');
    const ficha = screen.getByTestId('cs-cat-Servicios');
    expect(ficha).toHaveTextContent('usada por 80%');
    expect(within(ficha).getByText(/bajo acuerdo/)).toBeTruthy();
  });

  it('tocar una tarjeta avisa cuál es', async () => {
    const onTarjeta = vi.fn();
    render(<CardSortingCategoriesView data={data} onTarjeta={onTarjeta} />);
    await userEvent.click(within(screen.getByTestId('cs-cat-Vida')).getByRole('button', { name: 'Biblioteca' }));
    expect(onTarjeta).toHaveBeenCalledWith('Biblioteca');
  });
});
