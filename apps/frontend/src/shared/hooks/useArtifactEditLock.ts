import { useCallback, useEffect, useRef, useState } from 'react';
import { acquireLock, releaseLock } from '../api/artifacts.api';
import { notify } from '../api/toast';

const LOCK_TTL_SECONDS = 300;
const HEARTBEAT_MS = 120_000;

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
  const heartbeatRef = useRef<number | null>(null);
  const [lockLost, setLockLost] = useState(false);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current !== null) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const renew = useCallback(async () => {
    const artefactoId = activeLockRef.current;
    if (!artefactoId || document.visibilityState === 'hidden') return;
    try {
      await acquireLock(proyectoId, artefactoId, LOCK_TTL_SECONDS);
    } catch {
      // Una respuesta tardía de una edición cancelada no debe bloquear la
      // siguiente edición ni actualizar una pantalla desmontada.
      if (!mountedRef.current || activeLockRef.current !== artefactoId) return;
      activeLockRef.current = null;
      stopHeartbeat();
      setLockLost(true);
      notify.error('Se perdió el bloqueo de edición. Recarga el artefacto antes de guardar.');
    }
  }, [proyectoId, stopHeartbeat]);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatRef.current = window.setInterval(() => void renew(), HEARTBEAT_MS);
  }, [renew, stopHeartbeat]);

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
    stopHeartbeat();
    pendingLockRef.current = null;
    const activeId = activeLockRef.current;
    activeLockRef.current = null;
    if (activeId) releaseById(activeId);
    setLockLost(false);
  }, [releaseById, stopHeartbeat]);

  const acquire = useCallback(
    async (artefactoId: string) => {
      release();
      setLockLost(false);
      pendingLockRef.current = artefactoId;

      try {
        await acquireLock(proyectoId, artefactoId, LOCK_TTL_SECONDS);
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
      startHeartbeat();
      return true;
    },
    [proyectoId, release, releaseById, startHeartbeat],
  );

  useEffect(() => {
    mountedRef.current = true;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void renew();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      stopHeartbeat();
      pendingLockRef.current = null;
      const activeId = activeLockRef.current;
      activeLockRef.current = null;
      if (activeId) releaseById(activeId);
    };
  }, [releaseById, renew, stopHeartbeat]);

  return { acquire, release, lockLost };
}
