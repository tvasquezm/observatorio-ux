import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ParticipantCardSortingPage } from './ParticipantCardSortingPage';
import {
  getParticipantCardSortingSession,
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
