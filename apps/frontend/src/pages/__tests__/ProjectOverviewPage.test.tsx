import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProjectOverviewPage } from '../ProjectOverviewPage';
import { TECNICAS_INFO } from '../../shared/content/tecnicas-info';

vi.mock('react-router-dom', async original => ({ ...await original<typeof import('react-router-dom')>(), useOutletContext: () => ({ proyectoId: 'p1' }) }));
describe('selector de técnicas', () => {
  it('muestra las cinco descripciones, explicaciones y descargas', () => {
    render(<MemoryRouter><ProjectOverviewPage /></MemoryRouter>);
    for (const info of Object.values(TECNICAS_INFO)) expect(screen.getByText(info.descripcionCorta)).toBeVisible();
    expect(screen.getAllByText('Ver explicación completa')).toHaveLength(5);
    expect(screen.getAllByRole('button', { name: 'Descargar explicación (PDF)' })).toHaveLength(5);
  });
});
