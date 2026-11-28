import { useEffect, useRef, useState } from 'react';
import { API_BASE } from '../../shared/api/evaluator-client';

/**
 * Escucha los avisos del servidor de una evaluación abierta: llega uno cuando cambia de fase o cuando
 * alguien del equipo entrega, vota, pide cambios o confirma el acuerdo. No se avisa cada guardado de
 * borrador, y así no hace falta consultar cada pocos segundos.
 * Devuelve si la conexión está activa; si no lo está (o el navegador no la soporta), la página
 * vuelve a consultar de vez en cuando por su cuenta.
 */
export function useAvisosDeFase(proyectoId: string, evaluacionId: string | null, onAviso: (tipo: 'fase' | 'progreso') => void): boolean {
  const [conectado, setConectado] = useState(false);
  const alAviso = useRef(onAviso);
  alAviso.current = onAviso;
  useEffect(() => {
    setConectado(false);
    if (!evaluacionId || typeof EventSource === 'undefined') return;
    const fuente = new EventSource(`${API_BASE}/projects/${encodeURIComponent(proyectoId)}/evaluacion-heuristica/evaluaciones/${encodeURIComponent(evaluacionId)}/eventos`, { withCredentials: true });
    fuente.onopen = () => setConectado(true);
    fuente.onerror = () => setConectado(false);
    fuente.addEventListener('fase', () => alAviso.current('fase'));
    fuente.addEventListener('progreso', () => alAviso.current('progreso'));
    return () => fuente.close();
  }, [proyectoId, evaluacionId]);
  return conectado;
}
