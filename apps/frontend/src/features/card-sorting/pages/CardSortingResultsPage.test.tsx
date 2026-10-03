import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { CardSortingAnalytics } from '../api/card-sorting.api';
import { CardSortingResultsPage } from './CardSortingResultsPage';

let data: CardSortingAnalytics = {
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
  participantes: [
    { orden: 1, categoriasCount: 1, grupos: [{ categoria: 'Servicios', tarjetas: ['Biblioteca', 'Becas'] }] },
    { orden: 2, categoriasCount: 2, grupos: [{ categoria: 'Ayudas', tarjetas: ['Becas'] }, { categoria: 'Recursos', tarjetas: ['Biblioteca'] }] },
  ],
  preguntas: [],
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
    expect(screen.getByText('Participantes', { selector: 'span' })).toBeTruthy();
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

describe('CardSortingResultsPage · respuestas del participante', () => {
  const original = data;
  const conPreguntas = () => {
    data = {
      ...original,
      preguntas: [{ id: 'q1', texto: '¿Qué costó?', orden: 0, respuestas: ['Nada', '<b>x</b>'] }],
    } as CardSortingAnalytics;
  };
  afterEach(() => { data = original; });

  it('sin preguntas no hay pestaña Respuestas', () => {
    setup();
    expect(screen.queryByRole('tab', { name: 'Respuestas' })).toBeNull();
  });

  it('con preguntas aparece la pestaña y lista las respuestas como texto', () => {
    conPreguntas();
    setup('/r/e1?vista=answers');
    expect(screen.getByRole('tab', { name: 'Respuestas' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('¿Qué costó?')).toBeTruthy();
    expect(screen.getByText('Nada')).toBeTruthy();
    expect(screen.getByText('<b>x</b>')).toBeTruthy();
    expect(screen.getByText(/2 respuestas · anónimas/)).toBeTruthy();
  });

  it('?vista=answers sin preguntas cae en Tarjetas', () => {
    setup('/r/e1?vista=answers');
    expect(screen.getByRole('tab', { name: 'Tarjetas' }).getAttribute('aria-selected')).toBe('true');
  });

  it('pestaña Participantes: filas anónimas con sus grupos', () => {
    setup('/r/e1?vista=participants');
    expect(screen.getByRole('tab', { name: 'Participantes' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Participante 1')).toBeTruthy();
    expect(screen.getByText('Participante 2')).toBeTruthy();
    expect(screen.getByText('Ayudas: Becas')).toBeTruthy();
  });

  it('descarga el CSV de resultados y el de similitud', async () => {
    const blobs: Blob[] = [];
    Object.assign(URL, { createObjectURL: (b: Blob) => { blobs.push(b); return 'blob:x'; }, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Descargar CSV · resultados' }));
    fireEvent.click(screen.getByRole('button', { name: 'Descargar CSV · similitud' }));
    expect(click).toHaveBeenCalledTimes(2);
    const texto = await new Promise<string>((resolve) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result));
      lector.readAsText(blobs[1]);
    });
    expect(texto).toContain('Tarjeta,Biblioteca,Becas');
    expect(texto).toContain('Biblioteca,100,40');
  });

  it('pestaña Dendrograma: dibuja el árbol y lista las uniones en texto', () => {
    const { container } = setup('/r/e1?vista=dendrogram');
    expect(screen.getByRole('tab', { name: 'Dendrograma' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('img', { name: /Dendrograma de 2 tarjetas/ })).toBeTruthy();
    expect(container.querySelectorAll('path.cs-dendro-line')).toHaveLength(1);
    expect(screen.getByText('Biblioteca + Becas — similitud 40%')).toBeTruthy();
  });

  it('sin 2 tarjetas no ofrece la pestaña Dendrograma', () => {
    const anterior = data;
    data = { ...data, tarjetas: ['Solo'], matrizSimilitud: [[100]] };
    setup();
    expect(screen.queryByRole('tab', { name: 'Dendrograma' })).toBeNull();
    data = anterior;
  });
});
