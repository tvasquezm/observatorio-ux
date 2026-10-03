import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ParticipantCardSortingPage } from './ParticipantCardSortingPage';
import {
  getParticipantCardSortingSession,
  submitCardSortingResult,
  type ParticipantCardSortingSession,
} from '../api/participant-card-sorting.api';

vi.mock('../api/participant-card-sorting.api', () => ({
  getParticipantCardSortingSession: vi.fn(),
  submitCardSortingResult: vi.fn(),
}));

const SESION_ID = 'c1a9aa59-857c-46e8-b7f6-5e20d8eec052';

function sesion(tipo: 'ABIERTO' | 'CERRADO'): ParticipantCardSortingSession {
  return {
    id: SESION_ID,
    estado: 'EN_PROGRESO',
    estudio: {
      id: 'estudio-1',
      nombre: 'Portal estudiantil',
      tipoCardSorting: tipo,
      cerrado: false,
      cardsDefinidas: [
        { id: 'c1', etiqueta: 'Biblioteca' },
        { id: 'c2', etiqueta: 'Calendario' },
      ],
      categoriasDefinidas: tipo === 'CERRADO' ? [{ id: 'k1', nombre: 'Servicios' }] : [],
    },
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/participar/sesion/${SESION_ID}`]}>
      <Routes>
        <Route path="/participar/sesion/:sesionId" element={<ParticipantCardSortingPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ParticipantCardSortingPage · intro', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getParticipantCardSortingSession).mockReset();
  });

  it('en estudio ABIERTO muestra la consigna de crear categorías y luego el workspace', async () => {
    vi.mocked(getParticipantCardSortingSession).mockResolvedValue(sesion('ABIERTO'));
    renderPage();

    expect(await screen.findByText(/Crea tus propias categorías/)).toBeInTheDocument();
    expect(screen.getByText(/Son 2 tarjetas/)).toBeInTheDocument();
    expect(screen.queryByText('Biblioteca')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Comenzar' }));
    expect(await screen.findByText('Biblioteca')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Comenzar' })).not.toBeInTheDocument();
  });

  it('en estudio CERRADO la consigna indica usar las categorías dadas', async () => {
    vi.mocked(getParticipantCardSortingSession).mockResolvedValue(sesion('CERRADO'));
    renderPage();

    expect(await screen.findByText(/no puedes crear nuevas/)).toBeInTheDocument();
    expect(screen.queryByText(/Crea tus propias categorías/)).not.toBeInTheDocument();
  });

  it('omite la intro si ya hay progreso guardado', async () => {
    localStorage.setItem(
      `cardSorting:progreso:${SESION_ID}`,
      JSON.stringify({ asignaciones: { c1: 'k1' }, categoriasCreadas: [] }),
    );
    vi.mocked(getParticipantCardSortingSession).mockResolvedValue(sesion('CERRADO'));
    renderPage();

    expect(await screen.findByText('Calendario')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Comenzar' })).not.toBeInTheDocument();
  });
});

describe('ParticipantCardSortingPage · preguntas del evaluador', () => {
  const PREGUNTA = '3f2b8f0e-5c1d-4e3a-9a77-2d6f4b1c9e10';

  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getParticipantCardSortingSession).mockReset();
    vi.mocked(submitCardSortingResult).mockReset();
  });

  function conPreguntas() {
    const base = sesion('CERRADO');
    base.estudio.preguntas = [{ id: PREGUNTA, texto: '¿Qué te costó?', orden: 0 }];
    return base;
  }

  async function clasificarTodo() {
    await userEvent.click(await screen.findByRole('button', { name: 'Comenzar' }));
    const zona = await screen.findByText('Biblioteca');
    expect(zona).toBeInTheDocument();
  }

  it('muestra las preguntas con aviso de anonimato', async () => {
    vi.mocked(getParticipantCardSortingSession).mockResolvedValue(conPreguntas());
    renderPage();
    await clasificarTodo();
    expect(screen.getByLabelText('¿Qué te costó?')).toBeInTheDocument();
    expect(screen.getByText(/No escribas datos personales: tu participación es anónima/)).toBeInTheDocument();
  });

  it('no muestra la sección si el estudio no tiene preguntas', async () => {
    vi.mocked(getParticipantCardSortingSession).mockResolvedValue(sesion('CERRADO'));
    renderPage();
    await clasificarTodo();
    expect(screen.queryByText('Preguntas (opcionales)')).not.toBeInTheDocument();
  });

  it('envía las respuestas con su questionId y omite las vacías', async () => {
    vi.mocked(getParticipantCardSortingSession).mockResolvedValue(conPreguntas());
    vi.mocked(submitCardSortingResult).mockResolvedValue({ ok: true });
    localStorage.setItem(
      `cardSorting:progreso:${SESION_ID}`,
      JSON.stringify({ asignaciones: { c1: 'k1', c2: 'k1' }, categoriasCreadas: [], respuestas: { [PREGUNTA]: '  Nada  ', 'ajena': 'x' } }),
    );
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar clasificación' }));
    expect(submitCardSortingResult).toHaveBeenCalledTimes(1);
    expect(vi.mocked(submitCardSortingResult).mock.calls[0][2]).toEqual([
      { questionId: PREGUNTA, respuesta: 'Nada' },
    ]);
  });
});

describe('ParticipantCardSortingPage · subcategorías', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getParticipantCardSortingSession).mockReset();
    vi.mocked(submitCardSortingResult).mockReset();
  });

  it('la consigna de abierto menciona los dos niveles; la de cerrado no', async () => {
    vi.mocked(getParticipantCardSortingSession).mockResolvedValue(sesion('ABIERTO'));
    const { unmount } = renderPage();
    expect(await screen.findByText(/una categoría dentro de otra/)).toBeInTheDocument();
    unmount();

    vi.mocked(getParticipantCardSortingSession).mockResolvedValue(sesion('CERRADO'));
    renderPage();
    expect(await screen.findByText(/no puedes crear nuevas/)).toBeInTheDocument();
    expect(screen.queryByText(/dentro de otra/)).not.toBeInTheDocument();
  });

  it('un caché viejo sin `padres` carga y se envía sin categoriaPadre', async () => {
    vi.mocked(getParticipantCardSortingSession).mockResolvedValue(sesion('ABIERTO'));
    vi.mocked(submitCardSortingResult).mockResolvedValue({ ok: true });
    localStorage.setItem(
      `cardSorting:progreso:${SESION_ID}`,
      JSON.stringify({ asignaciones: { c1: 'Recursos', c2: 'Recursos' }, categoriasCreadas: ['Recursos'] }),
    );
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar clasificación' }));
    expect(vi.mocked(submitCardSortingResult).mock.calls[0][1]).toEqual([
      { categoriaNombre: 'Recursos', cardIds: ['c1', 'c2'] },
    ]);
  });

  it('un caché con `padres` envía categoriaPadre y se guarda al anidar', async () => {
    vi.mocked(getParticipantCardSortingSession).mockResolvedValue(sesion('ABIERTO'));
    vi.mocked(submitCardSortingResult).mockResolvedValue({ ok: true });
    localStorage.setItem(
      `cardSorting:progreso:${SESION_ID}`,
      JSON.stringify({
        asignaciones: { c1: 'Biblioteca', c2: 'Recursos' },
        categoriasCreadas: ['Recursos', 'Biblioteca'],
        padres: { Biblioteca: 'Recursos' },
      }),
    );
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar clasificación' }));
    expect(vi.mocked(submitCardSortingResult).mock.calls[0][1]).toEqual([
      { categoriaNombre: 'Recursos', cardIds: ['c2'] },
      { categoriaNombre: 'Biblioteca', categoriaPadre: 'Recursos', cardIds: ['c1'] },
    ]);
  });
});
