import { Subject } from 'rxjs';

/**
 * Aviso mínimo (sin contenido) de un cambio en los artefactos de un proyecto: personas, journey maps y
 * momentos críticos. `usuarioId` es quien lo causó, para que su propia pantalla no se refresque por algo que ya conoce.
 * `bloqueo`: alguien empezó o dejó de editar. `version`: se guardó una versión nueva. `creado` / `eliminado`: cambió la lista.
 */
export interface CambioDeArtefacto { proyectoId: string; tipo: 'bloqueo' | 'version' | 'creado' | 'eliminado'; usuarioId: string }

/** Canal en memoria: sirve con una sola instancia del backend (ver evaluacion-eventos.ts para la alternativa con varias). */
export const cambiosDeArtefactos = new Subject<CambioDeArtefacto>();

export function avisarArtefacto(proyectoId: string, tipo: CambioDeArtefacto['tipo'], usuarioId: string): void {
  cambiosDeArtefactos.next({ proyectoId, tipo, usuarioId });
}
