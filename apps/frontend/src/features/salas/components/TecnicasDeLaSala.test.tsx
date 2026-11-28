import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TecnicasDeLaSala } from './TecnicasDeLaSala';

describe('técnicas que se muestran en la analítica de la sala', () => {
  it('por defecto marca las cinco y guarda solo lo que cambió, en el orden de siempre', async () => {
    const mutate = vi.fn();
    render(<TecnicasDeLaSala guardar={{ mutate, isPending: false }} />);
    expect(screen.getByRole('heading', { name: /Técnicas que se muestran en la analítica de los proyectos/ })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
    const guardar = screen.getByRole('button', { name: 'Guardar técnicas' });
    expect(guardar).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Journey Map' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Momentos críticos' }));
    await userEvent.click(guardar);
    expect(mutate).toHaveBeenCalledWith({ tecnicasAnalizadas: ['personas', 'card-sorting', 'evaluacion-heuristica'] });
  });

  it('parte de las técnicas ya elegidas y exige al menos una', async () => {
    render(<TecnicasDeLaSala tecnicasAnalizadas={['personas', 'card-sorting']} guardar={{ mutate: vi.fn(), isPending: false }} />);
    expect(screen.getByRole('checkbox', { name: 'Personas' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Evaluación heurística' })).not.toBeChecked();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Personas' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Card Sorting' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Elige al menos una técnica');
    expect(screen.getByRole('button', { name: 'Guardar técnicas' })).toBeDisabled();
  });
});
