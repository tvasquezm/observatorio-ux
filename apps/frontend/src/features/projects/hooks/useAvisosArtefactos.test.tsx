import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useAvisosArtefactos } from './useAvisosArtefactos';

class FuenteFalsa {
  static ultima: FuenteFalsa | null = null;
  escuchas = new Map<string, (e: Event) => void>();
  cerrada = false;
  constructor(public url: string, public opciones?: { withCredentials?: boolean }) { FuenteFalsa.ultima = this; }
  addEventListener(tipo: string, fn: (e: Event) => void) { this.escuchas.set(tipo, fn); }
  close() { this.cerrada = true; }
}
const aviso = (usuarioId: string) => new MessageEvent('bloqueo', { data: JSON.stringify({ usuarioId }) });

describe('avisos de cambios en personas, journeys y momentos críticos', () => {
  beforeEach(() => {
    FuenteFalsa.ultima = null;
    vi.stubGlobal('EventSource', FuenteFalsa);
    useAuthStore.setState({ user: { id: 'u1', nombre: 'Ana', email: 'ana@utem.cl', rol: 'ESTUDIANTE' } });
  });
  afterEach(() => vi.unstubAllGlobals());

  function montar() {
    const client = new QueryClient();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    return { invalidar, ...renderHook(() => useAvisosArtefactos('p1'), { wrapper }) };
  }

  it('actualiza las listas del proyecto cuando otra persona cambia algo y se cierra al salir', () => {
    const { invalidar, unmount } = montar();
    const fuente = FuenteFalsa.ultima!;
    expect(fuente.url).toContain('/projects/p1/artifacts/eventos');
    expect(fuente.opciones?.withCredentials).toBe(true);
    fuente.escuchas.get('bloqueo')?.(aviso('u2'));
    const claves = invalidar.mock.calls.map(([f]) => f?.queryKey);
    expect(claves).toEqual(expect.arrayContaining([['personas', 'p1'], ['journeys', 'p1'], ['momentos-criticos', 'p1'], ['analitica-docente', 'p1']]));
    unmount();
    expect(fuente.cerrada).toBe(true);
  });

  it('ignora los cambios propios, para no pisar lo que la persona está editando', () => {
    const { invalidar } = montar();
    FuenteFalsa.ultima!.escuchas.get('bloqueo')?.(aviso('u1'));
    expect(invalidar).not.toHaveBeenCalled();
  });
});
