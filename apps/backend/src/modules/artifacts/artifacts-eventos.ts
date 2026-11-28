import { Subject } from 'rxjs';

/**
 * Aviso mínimo (sin contenido) de un cambio en los artefactos de un proyecto: personas, journey maps y
 * momentos críticos. `usuarioId` es quien lo causó, para que su propia pantalla no se refresque por algo que ya conoce.
 * `bloqueo`: alguien empezó o dejó de editar. `version`: se guardó una versión nueva. `creado` / `eliminado`: cambió la lista.
 * `miembros`: entró o salió alguien del equipo. `comentarios`: se escribió, editó o borró un comentario.
 */
export interface CambioDeArtefacto { proyectoId: string; tipo: 'bloqueo' | 'version' | 'creado' | 'eliminado' | 'miembros' | 'comentarios'; usuarioId: string }

/** Canal en memoria: sirve con una sola instancia del backend (ver evaluacion-eventos.ts para la alternativa con varias). */
export const cambiosDeArtefactos = new Subject<CambioDeArtefacto>();

/** Igual que `avisarArtefacto`, para los cambios del proyecto que no son artefactos (miembros y comentarios). */
export function avisarProyecto(proyectoId: string, tipo: 'miembros' | 'comentarios', usuarioId: string): void {
  cambiosDeArtefactos.next({ proyectoId, tipo, usuarioId });
}

export function avisarArtefacto(proyectoId: string, tipo: CambioDeArtefacto['tipo'], usuarioId: string): void {
  cambiosDeArtefactos.next({ proyectoId, tipo, usuarioId });
}
