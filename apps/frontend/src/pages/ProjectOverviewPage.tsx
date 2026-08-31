// apps/frontend/src/pages/ProjectOverviewPage.tsx

import { useOutletContext } from 'react-router-dom';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';

export function ProjectOverviewPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  return (
    <div className="panel">
      <p>Elegí una técnica en la barra de arriba para empezar a trabajar en este proyecto.</p>
      <small style={{ color: '#999' }}>ID: {proyectoId}</small>
    </div>
  );
}
