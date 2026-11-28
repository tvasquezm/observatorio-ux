import { useEffect, useState } from 'react';
import { VERSION_APP } from '../version';

const CADA_MS = 5 * 60_000;

/**
 * Avisa cuando el servidor ya publicó una versión distinta de la que tiene abierta esta pestaña, algo que pasa
 * si la página lleva horas abierta o el navegador conservó archivos viejos. Consulta `version.json` (sin caché) al
 * volver a la pestaña y cada 5 minutos; en desarrollo no hace nada.
 */
export function useVersionNueva(): boolean {
  const [hayNueva, setHayNueva] = useState(false);
  useEffect(() => {
    if (VERSION_APP === 'desarrollo') return;
    let activo = true;
    const comprobar = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const respuesta = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!respuesta.ok) return;
        const { id } = (await respuesta.json()) as { id?: string };
        if (activo && id && id !== VERSION_APP) setHayNueva(true);
      } catch { /* sin conexión o archivo ausente: se vuelve a intentar más tarde */ }
    };
    const temporizador = window.setInterval(() => void comprobar(), CADA_MS);
    document.addEventListener('visibilitychange', comprobar);
    void comprobar();
    return () => { activo = false; window.clearInterval(temporizador); document.removeEventListener('visibilitychange', comprobar); };
  }, []);
  return hayNueva;
}
