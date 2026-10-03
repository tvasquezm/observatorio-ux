// apps/frontend/src/pages/DashboardPage.tsx

import { Link } from 'react-router-dom';
import { useProjects } from '../features/projects/hooks/useProjectsQueries';
import { useSalas } from '../features/salas/hooks/useSalasQueries';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { PERSPECTIVE_LABELS, resolvePerspective } from '../shared/auth/perspectivas';
import { Icon } from '../shared/components/ui/Icon';

const DOT_COLORS = ['blue', 'green', 'orange'] as const;

const TECHNIQUES = [
  { to: 'personas', label: 'Personas', icon: 'personas', desc: 'Necesidades, motivaciones y escenarios reales', cls: 'c2' },
  { to: 'journey-map', label: 'Journey map', icon: 'journey', desc: 'Acciones, emociones y oportunidades por etapa', cls: 'c4' },
  { to: 'momentos-criticos', label: 'Momentos críticos', icon: 'momentos', desc: 'Impacto, frecuencia y priorización cualitativa', cls: 'c5' },
  { to: 'card-sorting', label: 'Card sorting', icon: 'card-sorting', desc: 'Agrupaciones, categorías y nivel de consenso', cls: 'c1' },
  { to: 'evaluacion-heuristica', label: 'Hallazgos heurísticos', icon: 'heuristica', desc: 'Severidad, evidencia y recomendaciones accionables', cls: 'c3' },
] as const;

function fechaHoy() {
  const f = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return f.charAt(0).toUpperCase() + f.slice(1);
}

export function DashboardPage() {
  const { data: proyectos, isLoading } = useProjects();
  const { user, perspectiveRole } = useAuthStore();
  const activeRole = user ? resolvePerspective(user.rol, perspectiveRole) : null;
  const esEstudiante = user?.rol === 'ESTUDIANTE';
  const { data: salas, isLoading: isLoadingSalas } = useSalas();
  const total = proyectos?.length ?? 0;
  const totalSesiones = proyectos?.reduce((suma, proyecto) => suma + (proyecto._count?.sesiones ?? 0), 0) ?? 0;
  const recientes = proyectos?.slice(0, 5) ?? [];
  const activo = proyectos?.[0] ?? null;

  return (
    <div className="fade">
      <section className="welcome">
        <div>
          <p className="welcome-meta">{fechaHoy()} · {total} {total === 1 ? 'proyecto disponible' : 'proyectos disponibles'}</p>
          <h1>Un mapa claro para decidir mejor.</h1>
          <p>
            {activo
              ? <>Centraliza la evidencia de <b>{activo.nombre}</b> y conecta cada técnica con una decisión de diseño.</>
              : 'Crea tu primer proyecto para comenzar a centralizar la evidencia de investigación.'}
          </p>
        </div>
        <div className="welcome-visual">
          <span className="node a">Evidencia</span>
          <span className="node b">Patrones</span>
          <span className="node c">Decisión</span>
          <b>UX<br />LAB</b>
        </div>
        <div className="welcome-actions">
          <Link to="/proyectos" className="primary">Ver proyectos</Link>
        </div>
      </section>

      <dl className="dash-facts">
        <div>
          <dt>Sesiones registradas</dt>
          <dd>{isLoading ? '—' : totalSesiones}</dd>
        </div>
        <div>
          <dt>Perspectiva activa</dt>
          <dd>{activeRole ? PERSPECTIVE_LABELS[activeRole] : '—'}</dd>
        </div>
        <div>
          <dt>Proyecto reciente</dt>
          <dd>{activo?.nombre ?? 'Ninguno'}</dd>
        </div>
      </dl>

      {esEstudiante && (
        <section className="panel">
          <div className="panel-head">
            <div>
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

      <div className="section-title">
        <div>
          <h2>Tu investigación, en vistas conectadas</h2>
        </div>
        <span className="count">5 métodos</span>
      </div>
      <section className="techniques">
        {TECHNIQUES.map((t) => (
          <Link
            key={t.to}
            to={activo ? `/proyectos/${activo.id.replace(/^\//, '')}/${t.to}` : '/proyectos'}
            className={`tech-card rise ${t.cls}`}
          >
            <span className="tech-glyph"><Icon name={t.icon} size={20} /></span>
            <h3>{t.label}</h3>
            <p>{t.desc}</p>
            <small>Ver método y análisis →</small>
          </Link>
        ))}
      </section>

      <section className="recent-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Actividad reciente</h2>
            </div>
            <Link to="/proyectos" className="ghost">Ver todos →</Link>
          </div>
          {isLoading && <p>Cargando…</p>}
          {recientes.map((p, i) => (
            <Link key={p.id} to={`/proyectos/${p.id.replace(/^\//, '')}`} className="project-row">
              <span className={`project-dot ${DOT_COLORS[i % DOT_COLORS.length]}`}>
                {p.nombre[0]?.toUpperCase()}
              </span>
              <div>
                <b>{p.nombre}</b>
                {p.descripcion && <small>{p.descripcion}</small>}
                <small>
                  {p._count?.sesiones ?? 0} {(p._count?.sesiones ?? 0) === 1 ? 'sesión registrada' : 'sesiones registradas'}
                </small>
              </div>
            </Link>
          ))}
          {!isLoading && recientes.length === 0 && (
            <p>Todavía no tienes proyectos — crea el primero desde "Proyectos".</p>
          )}
        </article>
        <article className="panel decision">
          <h2>Cada técnica alimenta la misma decisión.</h2>
          <p>Registra evidencia en persona, journey map, momentos críticos, card sorting y evaluación heurística, y conéctalas para argumentar un cambio de diseño.</p>
          {activo && <Link to={`/proyectos/${activo.id.replace(/^\//, '')}`} className="secondary">Abrir proyecto →</Link>}
        </article>
      </section>
    </div>
  );
}
