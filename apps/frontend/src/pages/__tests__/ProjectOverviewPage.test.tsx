import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProjectOverviewPage } from '../ProjectOverviewPage';
import { TECNICAS_INFO } from '../../shared/content/tecnicas-info';

vi.mock('react-router-dom', async original => ({ ...await original<typeof import('react-router-dom')>(), useOutletContext: () => ({ proyectoId: 'p1' }) }));
describe('selector de técnicas', () => {
  it('muestra las cinco descripciones breves', () => {
    render(<MemoryRouter><ProjectOverviewPage /></MemoryRouter>);
    for (const info of Object.values(TECNICAS_INFO)) {
      expect(info.descripcionCorta.trim()).not.toBe('');
      const descripcion = screen.getByText(info.descripcionCorta);
      expect(descripcion).toBeVisible();
      expect(descripcion.closest('a.tech-card')).toBeInTheDocument();
    }
  });

  it('ya no ofrece la explicación completa ni su descarga', () => {
    render(<MemoryRouter><ProjectOverviewPage /></MemoryRouter>);
    expect(screen.queryByText('Ver explicación completa')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descargar explicación (PDF)' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Descargar explicación/)).not.toBeInTheDocument();
  });

  it('cada tarjeta enlaza a su técnica con un ícono SVG decorativo', () => {
    render(<MemoryRouter><ProjectOverviewPage /></MemoryRouter>);
    const nombres = ['Personas', 'Journey Map', 'Momentos críticos', 'Card Sorting', 'Evaluación heurística'];
    for (const nombre of nombres) {
      const link = screen.getByRole('link', { name: new RegExp(`^${nombre}`) });
      expect(link).toHaveAttribute('href');
      expect(link.querySelector('.tech-icon svg')).toHaveAttribute('aria-hidden', 'true');
      expect(link.querySelector('.tech-icon')?.textContent).toBe('');
    }
  });
});
