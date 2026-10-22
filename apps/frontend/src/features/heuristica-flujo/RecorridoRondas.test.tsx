import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { copiarMetodologia, METODOLOGIAS_HEURISTICAS } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo } from '@observatorio-ux/shared-types';
import { RecorridoRondas } from './RecorridoRondas';
import { armarRondas } from './rondas';

function config(): ConfiguracionFlujo {
  const metodologia = copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]);
  return { nombre: 'Portal', producto: { clave: 'portal', nombre: 'Portal', version: '1', url: '', dispositivo: 'Web' }, objetivo: '', tareas: '', pantallas: '', exclusiones: '', metodologia, evaluadorIds: ['u1'], lectorIds: [] };
}

describe('recorrido por rondas', () => {
  it('muestra la ronda de la pregunta actual con sus categorías y el contenido', () => {
    const cfg = config(); const rondas = armarRondas(cfg.metodologia.criterios);
    expect(rondas.length).toBeGreaterThan(1);
    render(<RecorridoRondas config={cfg} indice={0} onIrA={vi.fn()}><p>contenido</p></RecorridoRondas>);
    expect(screen.getByText(`Ronda 1 de ${rondas.length}`)).toBeInTheDocument();
    expect(screen.getByText('contenido')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Ronda 1:/ })).toHaveAttribute('aria-current', 'true');
  });
  it('ir a una ronda entrega la posición de su primera pregunta', () => {
    const cfg = config(); const rondas = armarRondas(cfg.metodologia.criterios);
    const onIrA = vi.fn();
    render(<RecorridoRondas config={cfg} indice={0} onIrA={onIrA}><span /></RecorridoRondas>);
    fireEvent.click(screen.getByRole('button', { name: /^Ronda 2:/ }));
    expect(onIrA).toHaveBeenCalledWith(cfg.metodologia.criterios.findIndex(c => c.id === rondas[1].criterios[0].id));
  });
  it('la última pregunta pertenece a la última ronda', () => {
    const cfg = config(); const rondas = armarRondas(cfg.metodologia.criterios);
    render(<RecorridoRondas config={cfg} indice={cfg.metodologia.criterios.length - 1} onIrA={vi.fn()}><span /></RecorridoRondas>);
    expect(screen.getByText(`Ronda ${rondas.length} de ${rondas.length}`)).toBeInTheDocument();
  });
});
