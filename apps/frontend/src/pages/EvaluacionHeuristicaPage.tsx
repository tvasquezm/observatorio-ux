// apps/frontend/src/pages/EvaluacionHeuristicaPage.tsx
//
// Módulo de evaluación heurística: el flujo completo (preparar, evaluar,
// consensuar e informar) más los comentarios de la técnica.

import { useOutletContext } from 'react-router-dom';
import { FlujoHeuristicaPage } from '../features/heuristica-flujo/FlujoHeuristicaPage';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import { ComentariosTecnica } from '../features/comments/components/ComentariosTecnica';

export function EvaluacionHeuristicaPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  return (
    <>
      <FlujoHeuristicaPage />
      <ComentariosTecnica proyectoId={proyectoId} tecnica="evaluacion-heuristica" />
    </>
  );
}
