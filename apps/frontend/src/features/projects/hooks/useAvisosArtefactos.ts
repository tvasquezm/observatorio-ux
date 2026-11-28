import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '../../../shared/api/evaluator-client';
import { useAuthStore } from '../../auth/store/useAuthStore';

const TIPOS_DE_ARTEFACTOS = ['bloqueo', 'version', 'creado', 'eliminado'] as const;

/**
 * Mientras se mira un proyecto, el servidor avisa cuando otra persona crea, edita, bloquea o elimina una
 * persona, un journey map o un momento crítico, y también cuando cambia el equipo o se escribe un comentario.
 * Al recibirlo se vuelven a pedir solo esas listas, así quien espera lo ve al instante sin consultar cada
 * cierto tiempo. Los cambios propios se ignoran.
 */
export function useAvisosArtefactos(proyectoId: string | undefined): void {
  const client = useQueryClient();
  const usuarioId = useAuthStore((s) => s.user?.id ?? '');
  useEffect(() => {
    if (!proyectoId || typeof EventSource === 'undefined') return;
    const fuente = new EventSource(`${API_BASE}/projects/${encodeURIComponent(proyectoId)}/artifacts/eventos`, { withCredentials: true });
    const esAjeno = (e: Event) => {
      let autor = '';
      try { autor = (JSON.parse((e as MessageEvent<string>).data) as { usuarioId?: string }).usuarioId ?? ''; } catch { /* aviso sin autor: se actualiza igual */ }
      return !(autor && autor === usuarioId);
    };
    const alAvisoDeArtefacto = (e: Event) => {
      if (!esAjeno(e)) return;
      for (const clave of ['personas', 'journeys', 'momentos-criticos']) void client.invalidateQueries({ queryKey: [clave, proyectoId] });
      void client.invalidateQueries({ queryKey: ['analitica-docente', proyectoId] });
    };
    const alAvisoDeMiembros = (e: Event) => {
      if (!esAjeno(e)) return;
      void client.invalidateQueries({ queryKey: ['projects', proyectoId, 'miembros'] });
      void client.invalidateQueries({ queryKey: ['analitica-docente', proyectoId] });
    };
    const alAvisoDeComentarios = (e: Event) => {
      if (!esAjeno(e)) return;
      void client.invalidateQueries({ queryKey: ['projects', proyectoId, 'comments'] });
      void client.invalidateQueries({ queryKey: ['analitica-docente', proyectoId] });
    };
    for (const tipo of TIPOS_DE_ARTEFACTOS) fuente.addEventListener(tipo, alAvisoDeArtefacto);
    fuente.addEventListener('miembros', alAvisoDeMiembros);
    fuente.addEventListener('comentarios', alAvisoDeComentarios);
    return () => fuente.close();
  }, [proyectoId, usuarioId, client]);
}
