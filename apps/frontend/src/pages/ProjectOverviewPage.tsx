// apps/frontend/src/pages/ProjectOverviewPage.tsx

import { Link } from 'react-router-dom';
import { TECNICAS_INFO } from '../shared/content/tecnicas-info';
import { Icon } from '../shared/components/ui/Icon';

const TECHNIQUES = [
  { to: 'personas', icon: 'personas', title: 'Personas', color: 'blue' },
  { to: 'journey-map', icon: 'journey', title: 'Journey Map', color: 'green' },
  { to: 'momentos-criticos', icon: 'momentos', title: 'Momentos críticos', color: 'orange' },
  { to: 'card-sorting', icon: 'card-sorting', title: 'Card Sorting', color: 'purple' },
  { to: 'evaluacion-heuristica', icon: 'heuristica', title: 'Evaluación heurística', color: 'red' },
] as const;

export function ProjectOverviewPage() {
  return (
    <div>
      <div className="section-title"><div><h2>Tu espacio de investigación</h2><p className="muted">Elige una técnica para comenzar a construir evidencia.</p></div><span className="count">5 técnicas</span></div>
      <div className="tech-grid">
        {TECHNIQUES.map((technique) => (
          <Link key={technique.to} to={technique.to} className="tech-card">
            <span className={`tech-icon ${technique.color}`} aria-hidden="true"><Icon name={technique.icon} /></span>
            <span className="tech-card-copy"><h3>{technique.title}</h3><p>{TECNICAS_INFO[technique.to].descripcionCorta}</p></span>
            <span className="arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
