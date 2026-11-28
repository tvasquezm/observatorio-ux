import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '../../../shared/api/evaluator-client';
import { useAuthStore } from '../../auth/store/useAuthStore';

const TIPOS = ['bloqueo', 'version', 'creado', 'eliminado'] as const;

/**
 * Mientras se mira un proyecto, el servidor avisa cuando otra persona crea, edita, bloquea o elimina una
 * persona, un journey map o un momento crítico. Al recibirlo se vuelven a pedir esas listas, así quien espera
 * ve al instante que se liberó el bloqueo o que hay una versión nueva. Los cambios propios se ignoran.
 */
export function useAvisosArtefactos(proyectoId: string | undefined): void {
  const client = useQueryClient();
  const usuarioId = useAuthStore((s) => s.user?.id ?? '');
  useEffect(() => {
    if (!proyectoId || typeof EventSource === 'undefined') return;
    const fuente = new EventSource(`${API_BASE}/projects/${encodeURIComponent(proyectoId)}/artifacts/eventos`, { withCredentials: true });
    const alAviso = (e: Event) => {
      let autor = '';
      try { autor = (JSON.parse((e as MessageEvent<string>).data) as { usuarioId?: string }).usuarioId ?? ''; } catch { /* aviso sin autor: se actualiza igual */ }
      if (autor && autor === usuarioId) return;
      for (const clave of ['personas', 'journeys', 'momentos-criticos']) void client.invalidateQueries({ queryKey: [clave, proyectoId] });
      void client.invalidateQueries({ queryKey: ['analitica-docente', proyectoId] });
    };
    for (const tipo of TIPOS) fuente.addEventListener(tipo, alAviso);
    return () => fuente.close();
  }, [proyectoId, usuarioId, client]);
}
