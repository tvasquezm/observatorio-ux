// apps/frontend/src/pages/DashboardPage.tsx

import { Link } from 'react-router-dom';
import { useProjects } from '../features/projects/hooks/useProjectsQueries';

const DOT_COLORS = ['blue', 'green', 'orange'] as const;

export function DashboardPage() {
  const { data: proyectos, isLoading } = useProjects();
  const total = proyectos?.length ?? 0;
  const recientes = proyectos?.slice(0, 5) ?? [];

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">PANEL GENERAL</span>
          <h1>Bienvenido de vuelta</h1>
          <p>Así está tu actividad de investigación UX hoy.</p>
        </div>
        <Link to="/proyectos" className="primary">+ Nuevo proyecto</Link>
      </div>

      <div className="metrics">
        <div className="metric">
          <small>PROYECTOS</small>
          <strong>{isLoading ? '—' : total}</strong>
          <p>Proyectos activos en tu cuenta</p>
        </div>
        <div className="metric">
          <small>TÉCNICAS</small>
          <strong>5</strong>
          <p>Persona, journey, momentos, sorting, heurística</p>
        </div>
      </div>

      <div className="section-title">
        <h2>Proyectos recientes</h2>
        <span className="count">{total} en total</span>
      </div>

      <div className="panel">
        {isLoading && <p>Cargando…</p>}
        {recientes.map((p, i) => (
          <Link key={p.id} to={`/proyectos/${p.id.replace(/^\//, '')}`} className="project-row">
            <span className={`project-dot ${DOT_COLORS[i % DOT_COLORS.length]}`}>
              {p.nombre[0]?.toUpperCase()}
            </span>
            <div>
              <b>{p.nombre}</b>
              {p.descripcion && <small>{p.descripcion}</small>}
            </div>
          </Link>
        ))}
        {!isLoading && recientes.length === 0 && (
          <p>Todavía no tenés proyectos — creá el primero desde "Proyectos".</p>
        )}
      </div>
    </div>
  );
}
