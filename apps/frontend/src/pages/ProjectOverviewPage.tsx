// apps/frontend/src/pages/ProjectOverviewPage.tsx

import { Link, useOutletContext } from 'react-router-dom';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';

const TECHNIQUES = [
  { to: 'personas', icon: '◌', title: 'Personas', description: 'Define perfiles, motivaciones y necesidades de tus usuarios.', color: 'blue' },
  { to: 'journey-map', icon: '⌁', title: 'Journey Map', description: 'Visualiza el recorrido, emociones y oportunidades.', color: 'green' },
  { to: 'momentos-criticos', icon: '✚', title: 'Momentos críticos', description: 'Prioriza incidentes según impacto y frecuencia.', color: 'orange' },
  { to: 'card-sorting', icon: '▦', title: 'Card Sorting', description: 'Ordena contenidos y valida la arquitectura.', color: 'purple' },
  { to: 'evaluacion-heuristica', icon: '✦', title: 'Evaluación heurística', description: 'Registra hallazgos, evidencia y recomendaciones.', color: 'red' },
];

export function ProjectOverviewPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  return (
    <div>
      <div className="section-title"><div><h2>Tu espacio de investigación</h2><p className="muted">Elige una técnica para comenzar a construir evidencia.</p></div><span className="count">5 técnicas</span></div>
      <div className="tech-grid">
        {TECHNIQUES.map((technique) => (
          <Link key={technique.to} to={technique.to} className="tech-card">
            <span className={`tech-icon ${technique.color}`}>{technique.icon}</span>
            <span className="tech-card-copy"><h3>{technique.title}</h3><p>{technique.description}</p></span>
            <span className="arrow">→</span>
          </Link>
        ))}
      </div>
      <div className="panel overview-note"><span className="note-icon">i</span><div><b>Proyecto listo para trabajar</b><p>Los cambios se guardan como versiones para mantener la trazabilidad de tu investigación.</p><small>ID: {proyectoId}</small></div></div>
    </div>
  );
}
