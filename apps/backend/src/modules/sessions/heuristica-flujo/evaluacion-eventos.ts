import { Subject } from 'rxjs';

/**
 * Aviso mínimo (sin datos de la evaluación): quien lo recibe vuelve a pedirla con sus propios permisos.
 * `fase`: la evaluación pasó a otra fase. `progreso`: alguien entregó, votó, pidió cambios o confirmó el acuerdo.
 */
export interface CambioDeEvaluacion { id: string; tipo: 'fase' | 'progreso'; fase: string; revision: number }

/**
 * Canal en memoria de los cambios importantes de una evaluación. Sirve mientras el backend corre en una sola
 * instancia (como hoy en Render); con varias habría que reemplazarlo por un canal compartido (p. ej. Redis).
 * Los guardados de borrador no se avisan: son muy frecuentes y cada pantalla ya tiene su propia copia.
 */
export const cambiosDeEvaluacion = new Subject<CambioDeEvaluacion>();

/** Publica el aviso si el resultado es una evaluación que cambió de fase o, si `progreso`, tuvo un avance del equipo. */
export function avisarCambio(faseAntes: string | undefined, resultado: unknown, progreso: boolean): void {
  if (!resultado || typeof resultado !== 'object' || faseAntes === undefined) return;
  const { id, fase, revision } = resultado as { id?: unknown; fase?: unknown; revision?: unknown };
  if (typeof id !== 'string' || typeof fase !== 'string' || typeof revision !== 'number') return;
  if (fase !== faseAntes) cambiosDeEvaluacion.next({ id, tipo: 'fase', fase, revision });
  else if (progreso) cambiosDeEvaluacion.next({ id, tipo: 'progreso', fase, revision });
}
