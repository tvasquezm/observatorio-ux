import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copiarMetodologia, METODOLOGIAS_HEURISTICAS } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, RespuestaCriterio } from '@observatorio-ux/shared-types';
import { TarjetaPregunta } from './TarjetaPregunta';
import { respuestaVacia } from './flujo-utils';

vi.mock('./flujo.api', () => ({ flujoRequest: vi.fn() }));
vi.mock('./EvidenciaEditor', () => ({ EvidenciaEditor: () => null }));

function config(): ConfiguracionFlujo {
  const metodologia = copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]);
  return { nombre: 'Portal', producto: { clave: 'portal', nombre: 'Portal', version: '1', url: '', dispositivo: 'Web' }, objetivo: '', tareas: '', pantallas: '', exclusiones: '', metodologia, evaluadorIds: ['u1'], lectorIds: [] };
}
function Tarjeta({ numero = 1, total = 3, auto = true, onAvanzar, onCambio }: { numero?: number; total?: number; auto?: boolean; onAvanzar: () => void; onCambio?: (r: RespuestaCriterio) => void }) {
  const cfg = config();
  const criterio = cfg.metodologia.criterios[0];
  const [r, setR] = useState(respuestaVacia(criterio.id));
  const [activo, setActivo] = useState(auto);
  return <TarjetaPregunta config={cfg} criterio={criterio} numero={numero} total={total} respuesta={r} editable auto={activo} onAuto={setActivo} onChange={x => { setR(x); onCambio?.(x); }} onAvanzar={onAvanzar} />;
}
const esperar = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const clic = (nombre: string) => fireEvent.click(screen.getByRole('radio', { name: nombre }));
const tecla = (el: Element, key: string) => fireEvent.keyDown(el, { key });

describe('tarjeta de pregunta', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('responde con las teclas 1 a n y N, y ignora teclas fuera de la escala', () => {
    const onCambio = vi.fn();
    render(<Tarjeta auto={false} onAvanzar={vi.fn()} onCambio={onCambio} />);
    const radio = screen.getByRole('radio', { name: 'Cumple' });
    tecla(radio, '2');
    expect(screen.getByRole('radio', { name: 'Parcial' })).toBeChecked();
    tecla(radio, 'n');
    expect(screen.getByRole('radio', { name: 'No aplica' })).toBeChecked();
    onCambio.mockClear();
    tecla(radio, '4');
    expect(onCambio).not.toHaveBeenCalled();
    expect(screen.getByText('Atajos: teclas 1 a 3 para responder y N para No aplica.')).toBeInTheDocument();
  });
  it('no usa los atajos mientras se escribe en un campo de texto', () => {
    const onCambio = vi.fn();
    render(<Tarjeta auto={false} onAvanzar={vi.fn()} onCambio={onCambio} />);
    const notas = screen.getByLabelText('Notas de la valoración');
    tecla(notas, '1'); tecla(notas, 'n');
    expect(onCambio).not.toHaveBeenCalled();
    fireEvent.change(notas, { target: { value: '1n' } });
    expect(onCambio).toHaveBeenCalledWith(expect.objectContaining({ notas: '1n', valor: null, noAplica: false }));
  });
  it('avanza sola a los 600 ms y avisa', () => {
    const onAvanzar = vi.fn();
    render(<Tarjeta onAvanzar={onAvanzar} />);
    clic('Cumple');
    expect(screen.getByText('Respuesta guardada. Pasando a la siguiente pregunta.').closest('[role="status"]')).not.toBeNull();
    esperar(599); expect(onAvanzar).not.toHaveBeenCalled();
    esperar(1); expect(onAvanzar).toHaveBeenCalledTimes(1);
  });
  it('el último clic gana: cambiar de respuesta reinicia la espera', () => {
    const onAvanzar = vi.fn();
    render(<Tarjeta onAvanzar={onAvanzar} />);
    clic('Cumple');
    esperar(400);
    clic('Parcial');
    esperar(400); expect(onAvanzar).not.toHaveBeenCalled();
    esperar(200); expect(onAvanzar).toHaveBeenCalledTimes(1);
  });
  it('no avanza con una respuesta desfavorable, en la última pregunta ni con el interruptor apagado', () => {
    const onAvanzar = vi.fn();
    const { unmount } = render(<Tarjeta onAvanzar={onAvanzar} />);
    clic('No cumple');
    esperar(1000); expect(onAvanzar).not.toHaveBeenCalled();
    unmount();
    const ultima = render(<Tarjeta numero={3} total={3} onAvanzar={onAvanzar} />);
    clic('Cumple');
    esperar(1000); expect(onAvanzar).not.toHaveBeenCalled();
    ultima.unmount();
    render(<Tarjeta onAvanzar={onAvanzar} />);
    clic('Cumple');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pasar sola a la siguiente pregunta' }));
    esperar(1000); expect(onAvanzar).not.toHaveBeenCalled();
  });
});
