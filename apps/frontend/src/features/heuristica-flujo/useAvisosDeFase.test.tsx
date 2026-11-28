import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAvisosDeFase } from './useAvisosDeFase';

class FuenteFalsa {
  static ultima: FuenteFalsa | null = null;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  escuchas = new Map<string, () => void>();
  cerrada = false;
  constructor(public url: string, public opciones?: { withCredentials?: boolean }) { FuenteFalsa.ultima = this; }
  addEventListener(tipo: string, fn: () => void) { this.escuchas.set(tipo, fn); }
  close() { this.cerrada = true; }
}

describe('avisos de cambio de fase', () => {
  beforeEach(() => { FuenteFalsa.ultima = null; vi.stubGlobal('EventSource', FuenteFalsa); });
  afterEach(() => vi.unstubAllGlobals());

  it('se conecta a la evaluación con credenciales, avisa al cambiar de fase y se cierra al salir', () => {
    const alFase = vi.fn();
    const { result, unmount } = renderHook(() => useAvisosDeFase('p1', 'e1', alFase));
    const fuente = FuenteFalsa.ultima!;
    expect(fuente.url).toContain('/projects/p1/evaluacion-heuristica/evaluaciones/e1/eventos');
    expect(fuente.opciones?.withCredentials).toBe(true);
    expect(result.current).toBe(false);
    act(() => fuente.onopen?.());
    expect(result.current).toBe(true);
    act(() => fuente.escuchas.get('fase')?.());
    act(() => fuente.escuchas.get('progreso')?.());
    expect(alFase.mock.calls).toEqual([['fase'], ['progreso']]);
    act(() => fuente.onerror?.());
    expect(result.current).toBe(false);
    unmount();
    expect(fuente.cerrada).toBe(true);
  });

  it('sin evaluación abierta o sin soporte del navegador no abre ninguna conexión', () => {
    renderHook(() => useAvisosDeFase('p1', null, vi.fn()));
    expect(FuenteFalsa.ultima).toBeNull();
    vi.stubGlobal('EventSource', undefined);
    const { result } = renderHook(() => useAvisosDeFase('p1', 'e1', vi.fn()));
    expect(result.current).toBe(false);
  });
});
