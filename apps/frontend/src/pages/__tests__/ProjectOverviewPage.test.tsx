import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProjectOverviewPage } from '../ProjectOverviewPage';
import { TECNICAS_INFO } from '../../shared/content/tecnicas-info';

vi.mock('react-router-dom', async original => ({ ...await original<typeof import('react-router-dom')>(), useOutletContext: () => ({ proyectoId: 'p1' }) }));
describe('selector de técnicas', () => {
  it('muestra las cinco descripciones breves', () => {
    render(<MemoryRouter><ProjectOverviewPage /></MemoryRouter>);
    for (const info of Object.values(TECNICAS_INFO)) expect(screen.getByText(info.descripcionCorta)).toBeVisible();
  });

  it('ya no ofrece la explicación completa ni su descarga', () => {
    render(<MemoryRouter><ProjectOverviewPage /></MemoryRouter>);
    expect(screen.queryByText('Ver explicación completa')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descargar explicación (PDF)' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Descargar explicación/)).not.toBeInTheDocument();
  });
});
