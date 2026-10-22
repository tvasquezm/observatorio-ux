import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResumenRonda } from './ResumenRonda';

const base = { numero: 1, total: 3, final: false, respondidas: 3, noAplican: 1, problemas: 1, pendientes: 0 };
function montar(over: Partial<typeof base> = {}) {
  const onSeguir = vi.fn(); const onVolver = vi.fn();
  render(<ResumenRonda {...base} {...over} onSeguir={onSeguir} onVolver={onVolver} />);
  return { onSeguir, onVolver };
}

describe('resumen de ronda', () => {
  it('cuenta en texto y usa plurales correctos', () => {
    montar();
    expect(screen.getByRole('heading', { name: 'Terminaste la ronda 1 de 3' })).toBeInTheDocument();
    expect(screen.getByText('3 preguntas respondidas')).toBeInTheDocument();
    expect(screen.getByText('1 no aplica')).toBeInTheDocument();
    expect(screen.getByText('1 problema registrado en esta ronda.')).toBeInTheDocument();
    expect(screen.getByText('Sin preguntas pendientes.')).toBeInTheDocument();
  });
  it('seguir y volver llaman a sus acciones', () => {
    const { onSeguir, onVolver } = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Seguir con la ronda siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Volver a esta ronda' }));
    expect(onSeguir).toHaveBeenCalledTimes(1); expect(onVolver).toHaveBeenCalledTimes(1);
  });
  it('revisión final sin pendientes manda a entregar y no ofrece seguir', () => {
    montar({ final: true });
    expect(screen.getByRole('heading', { name: 'Revisión final' })).toBeInTheDocument();
    expect(screen.getByText('Todo respondido. Usa «Entregar mi evaluación».')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Seguir con la ronda siguiente' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ir a lo pendiente' })).toBeNull();
  });
  it('revisión final con pendientes ofrece ir a lo pendiente', () => {
    const { onSeguir } = montar({ final: true, pendientes: 2 });
    expect(screen.getByText('2 preguntas pendientes.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ir a lo pendiente' }));
    expect(onSeguir).toHaveBeenCalledTimes(1);
  });
});
