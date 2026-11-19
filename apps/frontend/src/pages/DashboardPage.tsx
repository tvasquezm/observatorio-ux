import { TECNICAS_INFO } from '../shared/content/tecnicas-info';
// apps/frontend/src/pages/DashboardPage.tsx
//
// Inicio del evaluador en dos pasos: 1 · Proyecto (selector) y 2 · Técnica
// (las cinco tarjetas abren la técnica dentro del proyecto elegido). La
// jerarquía Sala → Proyecto → Técnica se enseña con la estructura, sin panel
// aparte. El estudiante ve además, debajo, las salas en las que está inscrito.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects } from '../features/projects/hooks/useProjectsQueries';
import { useSalas } from '../features/salas/hooks/useSalasQueries';
import { useAuthStore } from '../features/auth/store/useAuthStore';

const TECHNIQUES = [
  { to: 'personas', label: 'Personas', icon: '◌', cls: 'c2' },
  { to: 'journey-map', label: 'Journey Map', icon: '⌁', cls: 'c4' },
  { to: 'momentos-criticos', label: 'Momentos críticos', icon: '✚', cls: 'c5' },
  { to: 'card-sorting', label: 'Card Sorting', icon: '▦', cls: 'c1' },
  { to: 'evaluacion-heuristica', label: 'Evaluación heurística', icon: '✦', cls: 'c3' },
] as const;

function fechaHoy() {
  const f = new Date();
  return f.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
}

export function DashboardPage() {
  const { data: proyectos, isLoading, isError, refetch } = useProjects();
  const { user } = useAuthStore();
  const esEstudiante = user?.rol === 'ESTUDIANTE';
  const { data: salas, isLoading: isLoadingSalas } = useSalas();
  const total = proyectos?.length ?? 0;
  const projectKey = `observatorio-ux-project:${user?.id ?? 'anonymous'}`;
  const [selectedId, setSelectedId] = useState(() => sessionStorage.getItem(projectKey) ?? '');
  const activo = proyectos?.find(p => p.id === selectedId) ?? (proyectos?.length === 1 ? proyectos[0] : null);
  useEffect(() => {
    if (isLoading || isError || !proyectos) return;
    if (activo) sessionStorage.setItem(projectKey, activo.id);
    else { sessionStorage.removeItem(projectKey); if (selectedId) setSelectedId(''); }
  }, [activo, projectKey, proyectos, isLoading, isError, selectedId]);
  function chooseProject(id: string) { setSelectedId(id); if (id) sessionStorage.setItem(projectKey, id); else sessionStorage.removeItem(projectKey); }

  return (
    <div className="fade dashboard-page">
      <section className="welcome">
        <div>
          <span className="kicker">{fechaHoy()}</span>
          <h1>Un mapa claro para decidir mejor.</h1>
        </div>
        <div className="welcome-visual" aria-hidden="true">
          <span className="node a">Evidencia</span>
          <span className="node b">Patrones</span>
          <span className="node c">Decisión</span>
          <b>UX<br />LAB</b>
        </div>
      </section>

      <section className="panel active-project" aria-labelledby="paso-proyecto">
        <h2 id="paso-proyecto" className="step-title"><span className="step-num" aria-hidden="true">1</span> Proyecto</h2>
        {isError ? <div role="alert"><p>No pudimos cargar tus proyectos. Comprueba tu conexión y vuelve a intentarlo.</p><button type="button" className="secondary" onClick={() => void refetch()}>Reintentar</button></div> : isLoading ? <p role="status">Cargando proyectos…</p> : total > 0 ? <>
          <div className="step-project-row">
            <div className="field"><label htmlFor="active-project">Proyecto activo</label><select id="active-project" value={activo?.id ?? ''} onChange={e => chooseProject(e.target.value)}><option value="">Selecciona un proyecto…</option>{proyectos?.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
            <Link to="/proyectos" className="ghost">Todos los proyectos</Link>
          </div>
          {!activo && <p className="text-muted">Selecciona un proyecto para abrir sus técnicas.</p>}
        </> : <><p>Todavía no tienes proyectos.</p><Link to="/proyectos" className="primary">Crear tu primer proyecto</Link></>}
      </section>

      <h2 id="paso-tecnica" className="step-title"><span className="step-num" aria-hidden="true">2</span> Técnica</h2>
      <section className="techniques" aria-labelledby="paso-tecnica">
        {TECHNIQUES.map((t) => (
          <Link
            key={t.to}
            to={activo ? `/proyectos/${activo.id.replace(/^\//, '')}/${t.to}` : '/proyectos'}
            className={`tech-card rise ${t.cls}`}
          >
            <span className="tech-glyph" aria-hidden="true">{t.icon}</span>
            <h3>{t.label}</h3>
            <p>{TECNICAS_INFO[t.to].descripcionCorta}</p>
            <small>{activo ? 'Abrir técnica →' : 'Elegir proyecto →'}</small>
          </Link>
        ))}
      </section>

      {esEstudiante && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <span className="kicker">MIS SALAS</span>
              <h2>Salas en las que estás inscrito</h2>
            </div>
          </div>
          {isLoadingSalas && <p>Cargando…</p>}
          {!isLoadingSalas && (salas?.length ?? 0) === 0 && (
            <p>No estás inscrito en ninguna sala todavía.</p>
          )}
          {salas?.map((sala) => (
            <div key={sala.id} className="project-row">
              <div>
                <b>{sala.nombre}</b>
                <small>{sala.periodo}</small>
                {sala.profesor && <small>Profesor: {sala.profesor.nombre}</small>}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
