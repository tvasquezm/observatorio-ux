import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { CardSortingPage } from './CardSortingPage';

vi.mock('../features/card-sorting/hooks/useCardSortingQueries', () => ({
  useCardSortingEstudiosByProyecto: () => ({ data: [], isLoading: false }),
  useCreateCardSortingSession: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/p']}>
      <Routes>
        <Route element={<Outlet context={{ proyectoId: 'proyecto-1' }} />}>
          <Route path="/p" element={<CardSortingPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('CardSortingPage · guía', () => {
  it('muestra la guía de 8 pasos junto al formulario', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Cómo hacer un card sorting' })).toBeInTheDocument();
    expect(screen.getByText('Extraer conclusiones')).toBeInTheDocument();
  });

  it('explica cuándo usar abierto o cerrado según el tipo elegido', async () => {
    renderPage();
    expect(screen.getByTestId('cs-type-hint')).toHaveTextContent(/descubrir cómo piensan/);

    await userEvent.selectOptions(screen.getByLabelText(/Tipo de estudio/), 'CERRADO');
    expect(screen.getByTestId('cs-type-hint')).toHaveTextContent(/validar una estructura/);
  });
});
