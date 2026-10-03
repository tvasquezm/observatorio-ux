import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { CardSortingAnalytics } from '../api/card-sorting.api';
import { CardSortingResultsPage } from './CardSortingResultsPage';

const data: CardSortingAnalytics = {
  estudio: { id: 'e1', proyectoId: 'p1', nombre: 'Estudio demo', cerrado: false, createdAt: '2026-10-02' },
  participantesCount: 3,
  cardsCount: 2,
  acuerdoGlobal: 60,
  tarjetas: ['Biblioteca', 'Becas'],
  matrizSimilitud: [[100, 40], [40, 100]],
  frecuenciaPorCategoria: [{ nombre: 'Servicios', porcentaje: 80 }],
  clusters: [{ nombre: 'Servicios', acuerdo: 80, tarjetas: ['Biblioteca', 'Becas'] }],
  sinConsenso: ['Otra'],
  muestra: 'baja',
  umbrales: { consenso: 50, muestraMinima: 15, muestraEstable: 30 },
  categorias: ['Servicios'],
  resultsMatrix: { categorias: ['Servicios'], filas: [{ tarjeta: 'Biblioteca', valores: [3] }] },
  popularPlacementsMatrix: { categorias: ['Servicios'], filas: [{ tarjeta: 'Biblioteca', valores: [100] }] },
  porCarta: [{ tarjeta: 'Biblioteca', categoriasCount: 2, categorias: [{ nombre: 'A', frecuencia: 2 }, { nombre: 'B', frecuencia: 1 }] }],
  porCategoria: [],
} as unknown as CardSortingAnalytics;

vi.mock('../hooks/useCardSortingQueries', () => ({
  useCardSortingAnalytics: () => ({ data, isLoading: false, error: null, refetch: vi.fn() }),
}));

function setup(initial = '/r/e1') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/r/:estudioId" element={<CardSortingResultsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CardSortingResultsPage (minimalista)', () => {
  it('aplica el contenedor .cs-results', () => {
    const { container } = setup();
    expect(container.firstElementChild?.classList.contains('cs-results')).toBe(true);
  });

  it('elimina los rótulos EXPLORAR, CATEGORÍAS y CONSENSO', () => {
    setup();
    for (const label of ['EXPLORAR', 'CATEGORÍAS', 'CONSENSO']) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it('etiquetas de KPI en minúscula (sin mayúsculas fijas)', () => {
    setup();
    expect(screen.getByText('Participantes')).toBeTruthy();
    expect(screen.queryByText('PARTICIPANTES')).toBeNull();
  });

  it('mantiene los textos de la Fase 1', () => {
    setup();
    expect(screen.getByTestId('cs-sample-note').textContent).toContain('Muestra baja');
    expect(screen.getByText(/más del 50% de los participantes/)).toBeTruthy();
    expect(screen.getByText(/Sin consenso \(≤50%\)/)).toBeTruthy();
  });

  it('las pestañas cambian con flechas del teclado', () => {
    setup();
    const first = screen.getByRole('tab', { name: 'Tarjetas' });
    expect(first.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Categorías' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Categorías' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'Tarjetas' }).getAttribute('aria-selected')).toBe('true');
  });

  it('distribución en texto plano: "nombre (n)"', () => {
    setup();
    expect(screen.getByText('A (2)')).toBeTruthy();
    expect(screen.getByText('B (1)')).toBeTruthy();
  });

  it('similitud: la diagonal se marca atenuada', () => {
    const { container } = setup('/r/e1?vista=similarity');
    expect(container.querySelectorAll('.cs-matrix-diag').length).toBe(2);
  });
});
