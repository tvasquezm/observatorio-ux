import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const { exportarEstudioPdf } = vi.hoisted(() => ({ exportarEstudioPdf: vi.fn(async (..._args: unknown[]) => {}) }));
vi.mock('../card-sorting-pdf', () => ({ exportarEstudioPdf, precargarEstudioPdf: vi.fn() }));

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

  it('cada tarjeta muestra su distribución en porcentaje y su estado de consenso', () => {
    setup();
    const fila = screen.getByTestId('cs-card-row-Biblioteca');
    expect(fila).toHaveTextContent('A 67% (2)');
    expect(fila).toHaveTextContent('B 33% (1)');
    expect(fila).toHaveTextContent('Consenso · 67%');
    expect(screen.getByTestId('cs-cards-summary')).toHaveTextContent('1 con consenso');
  });

  it('tocar una categoría de una tarjeta abre la pestaña Categorías', () => {
    setup();
    fireEvent.click(within(screen.getByTestId('cs-card-row-Biblioteca')).getByRole('button', { name: 'A' }));
    expect(screen.getByRole('tab', { name: 'Categorías' }).getAttribute('aria-selected')).toBe('true');
  });

  it('KPIs sin subtítulos y "Acuerdo global" con ayuda', () => {
    setup();
    expect(screen.queryByText('clasificaciones completadas')).toBeNull();
    expect(screen.getByRole('button', { name: 'Ayuda: acuerdo global' })).toBeTruthy();
  });

  it('muestra baja como etiqueta corta con la explicación en la ayuda', () => {
    setup();
    expect(screen.getByText('Muestra baja', { selector: 'span:not(.info-tip-panel)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ayuda: tamaño de muestra' })).toBeTruthy();
  });

  it('descargas y actualizar son botones de ícono con nombre accesible', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Descargar CSV de esta vista' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Descargar PDF de esta vista' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Descargar PDF de todas las vistas' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Actualizar resultados' })).toBeTruthy();
  });

  it('pestañas con etiquetas cortas y título con ayuda por vista', () => {
    setup('/r/e1?vista=results');
    expect(screen.getByRole('tab', { name: 'Matriz' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Populares' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Cantidad de ubicaciones' })).toBeTruthy();
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

  async function leerBlob(blob: Blob) {
    return new Promise<string>((resolve) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result));
      lector.readAsText(blob);
    });
  }

  it('el CSV corresponde a la vista activa, con ";" y nombre de archivo del estudio', async () => {
    const blobs: Blob[] = [];
    const nombres: string[] = [];
    Object.assign(URL, { createObjectURL: (b: Blob) => { blobs.push(b); return 'blob:x'; }, revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { nombres.push(this.download); });
    setup('/r/e1?vista=similarity');
    fireEvent.click(screen.getByRole('button', { name: 'Descargar CSV de esta vista' }));
    const texto = await leerBlob(blobs[0]);
    expect(nombres[0]).toBe('card-sorting-estudio-demo-similarity.csv');
    expect(texto).toContain('Tarjeta (% similitud);Biblioteca;Becas');
    expect(texto).toContain('Biblioteca;100;40');
  });

  it('el CSV de Tarjetas trae estado y categoría principal', async () => {
    const blobs: Blob[] = [];
    Object.assign(URL, { createObjectURL: (b: Blob) => { blobs.push(b); return 'blob:x'; }, revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Descargar CSV de esta vista' }));
    const texto = await leerBlob(blobs[0]);
    expect(texto).toContain('Tarjeta;Estado;Categoría principal;% participantes;Participantes;Otras categorías');
    expect(texto).toContain('Biblioteca;Consenso;A;67;2;B 33%');
  });

  it('PDF de esta vista y PDF completo piden las vistas correctas', async () => {
    exportarEstudioPdf.mockClear();
    setup('/r/e1?vista=participants');
    fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF de esta vista' }));
    await waitFor(() => expect(exportarEstudioPdf).toHaveBeenCalledTimes(1));
    expect(exportarEstudioPdf).toHaveBeenLastCalledWith(data, ['participants'], 'vista');
    fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF de todas las vistas' }));
    await waitFor(() => expect(exportarEstudioPdf).toHaveBeenCalledTimes(2));
    expect(exportarEstudioPdf).toHaveBeenLastCalledWith(
      data,
      ['cards', 'categories', 'results', 'popular', 'similarity', 'dendrogram', 'participants'],
      'todas',
    );
  });

  it('si el PDF falla, avisa con un mensaje', async () => {
    exportarEstudioPdf.mockRejectedValueOnce(new Error('No pudimos cargar la identidad del informe.'));
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF de esta vista' }));
    expect((await screen.findByRole('alert')).textContent).toContain('No pudimos cargar la identidad');
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

  it('umbral de consenso editable: recalcula la vista y se puede restablecer', () => {
    setup();
    expect(screen.getByText(/con consenso ·/)).toHaveTextContent('1 con consenso · 0 sin consenso');
    const control = screen.getByRole('slider', { name: 'Umbral de consenso' });
    expect(control).toHaveValue('50');
    expect(screen.queryByRole('button', { name: /Restablecer/ })).toBeNull();

    fireEvent.change(control, { target: { value: '70' } });
    expect(screen.getByText(/con consenso ·/)).toHaveTextContent('0 con consenso · 1 sin consenso');
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer (50%)' }));
    expect(screen.getByText(/con consenso ·/)).toHaveTextContent('1 con consenso · 0 sin consenso');
  });

  it('?umbral= se respeta y uno fuera de rango se ignora', () => {
    setup('/r/e1?umbral=80');
    expect(screen.getByRole('slider', { name: 'Umbral de consenso' })).toHaveValue('80');
  });

  it('?umbral=10 (fuera de rango) usa el del curso', () => {
    setup('/r/e1?umbral=10');
    expect(screen.getByRole('slider', { name: 'Umbral de consenso' })).toHaveValue('50');
  });

  it('similitud: marca con borde los pares sobre el umbral', () => {
    const anterior = data;
    data = { ...data, matrizSimilitud: [[100, 70], [70, 100]] };
    const { container } = setup('/r/e1?vista=similarity&umbral=60');
    expect(screen.getByText('Borde: pares con más de 60% de similitud.')).toBeTruthy();
    expect(container.querySelectorAll('td.cs-matrix-strong')).toHaveLength(2);
    data = anterior;
  });
});
