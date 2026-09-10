import { useCallback, useEffect, useRef } from 'react';
import { acquireLock, releaseLock } from '../api/artifacts.api';

/**
 * Mantiene un único lock de edición por pantalla y garantiza su liberación
 * al cancelar, cambiar de artefacto o desmontar la ruta. También cubre la
 * carrera donde el usuario abandona la pantalla mientras el POST /lock sigue
 * pendiente: si la respuesta llega después, el lock se libera de inmediato.
 */
export function useArtifactEditLock(proyectoId: string) {
  const activeLockRef = useRef<string | null>(null);
  const pendingLockRef = useRef<string | null>(null);
  const mountedRef = useRef(false);

  const releaseById = useCallback(
    (artefactoId: string) => {
      void releaseLock(proyectoId, artefactoId).catch(() => {
        // Es una limpieza best-effort; el TTL del backend sigue siendo la
        // última red de seguridad si se pierde la conexión al desmontar.
      });
    },
    [proyectoId],
  );

  const release = useCallback(() => {
    pendingLockRef.current = null;
    const activeId = activeLockRef.current;
    activeLockRef.current = null;
    if (activeId) releaseById(activeId);
  }, [releaseById]);

  const acquire = useCallback(
    async (artefactoId: string) => {
      release();
      pendingLockRef.current = artefactoId;

      try {
        await acquireLock(proyectoId, artefactoId);
      } catch (error) {
        if (pendingLockRef.current === artefactoId) pendingLockRef.current = null;
        throw error;
      }

      if (!mountedRef.current || pendingLockRef.current !== artefactoId) {
        releaseById(artefactoId);
        return false;
      }

      pendingLockRef.current = null;
      activeLockRef.current = artefactoId;
      return true;
    },
    [proyectoId, release, releaseById],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pendingLockRef.current = null;
      const activeId = activeLockRef.current;
      activeLockRef.current = null;
      if (activeId) releaseById(activeId);
    };
  }, [releaseById]);

  return { acquire, release };
}
