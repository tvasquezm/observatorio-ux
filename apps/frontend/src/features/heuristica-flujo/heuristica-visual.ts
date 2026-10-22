import type { FaseHeuristica } from '@observatorio-ux/shared-types';
import type { ProcessStep } from '../../shared/components/TechniqueProcess';

/** `null` = todavía no hay una revisión abierta: se está preparando. */
export function procesoHeuristica(fase: FaseHeuristica | null): ProcessStep[] {
  const etapa = fase === 'EN_EVALUACION' ? 1 : fase === 'PENDIENTE_CONSENSO' ? 2 : fase === 'CONSOLIDADA' || fase === 'FINALIZADA' ? 3 : 0;
  return [
    { id: 'preparar', label: 'Preparar', detail: 'Producto y metodología', done: etapa > 0 },
    { id: 'revisar', label: 'Revisar', detail: 'Responde y anota problemas', done: etapa > 1 },
    { id: 'acordar', label: 'Acordar', detail: 'El equipo une sus respuestas', done: etapa > 2 },
    { id: 'informe', label: 'Informe', detail: 'Resultado para compartir', done: fase === 'FINALIZADA' },
  ];
}
