// apps/frontend/src/pages/DashboardPage.tsx

import { Link } from 'react-router-dom';
import { useProjects } from '../features/projects/hooks/useProjectsQueries';
import { useAuthStore } from '../features/auth/store/useAuthStore';

const DOT_COLORS = ['blue', 'green', 'orange'] as const;

const TECHNIQUES = [
  { to: 'personas', label: 'Personas', icon: '◌', desc: 'Necesidades, motivaciones y escenarios reales', cls: 'c2' },
  { to: 'journey-map', label: 'Journey map', icon: '⌁', desc: 'Acciones, emociones y oportunidades por etapa', cls: 'c4' },
  { to: 'momentos-criticos', label: 'Momentos críticos', icon: '✚', desc: 'Impacto, frecuencia y priorización cualitativa', cls: 'c5' },
  { to: 'card-sorting', label: 'Card sorting', icon: '▦', desc: 'Agrupaciones, categorías y nivel de consenso', cls: 'c1' },
  { to: 'evaluacion-heuristica', label: 'Hallazgos heurísticos', icon: '✦', desc: 'Severidad, evidencia y recomendaciones accionables', cls: 'c3' },
] as const;

function fechaHoy() {
  const f = new Date();
  return f.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
}

export function DashboardPage() {
  const { data: proyectos, isLoading } = useProjects();
  const user = useAuthStore((s) => s.user);
  const total = proyectos?.length ?? 0;
  const recientes = proyectos?.slice(0, 5) ?? [];
  const activo = proyectos?.[0] ?? null;

  return (
    <div className="fade">
      <section className="welcome">
        <div>
          <span className="kicker">{fechaHoy()} · <i style={{ color: '#24a77c' }}>●</i> {total} PROYECTO{total === 1 ? '' : 'S'} ACTIVO{total === 1 ? '' : 'S'}</span>
          <h1>Un mapa claro para decidir mejor.</h1>
          <p>
            {activo
              ? <>Centraliza la evidencia de <b>{activo.nombre}</b> y conecta cada técnica con una decisión de diseño.</>
              : 'Creá tu primer proyecto para empezar a centralizar la evidencia de investigación.'}
          </p>
        </div>
        <div className="welcome-visual">
          <span className="node a">Evidencia</span>
          <span className="node b">Patrones</span>
          <span className="node c">Decisión</span>
          <b>UX<br />LAB</b>
        </div>
        <div className="welcome-actions">
          <Link to="/proyectos" className="primary">+ Nuevo proyecto</Link>
        </div>
      </section>

      <section className="metrics">
        <article className="metric rise">
          <small>Proyectos</small>
          <strong>{isLoading ? '—' : String(total).padStart(2, '0')}</strong>
          <p>Proyectos de investigación activos</p>
        </article>
        <article className="metric rise">
          <small>Técnicas disponibles</small>
          <strong>05</strong>
          <p>Persona, journey, momentos, sorting, heurística</p>
        </article>
        <article className="metric rise">
          <small>Rol</small>
          <strong style={{ fontSize: 16 }}>{user?.rol ?? '—'}</strong>
          <p>{user?.nombre}</p>
        </article>
        <article className="metric rise">
          <small>Proyecto activo</small>
          <strong style={{ fontSize: 16 }}>{activo?.nombre ?? 'Ninguno'}</strong>
          <p>{activo ? 'Abrí una técnica para trabajar' : 'Creá uno desde "Proyectos"'}</p>
        </article>
      </section>

      <div className="section-title">
        <div>
          <span className="kicker">MÉTODOS DISPONIBLES</span>
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
            <span className="tech-glyph">{t.icon}</span>
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
              <span className="kicker">PROYECTOS</span>
              <h2>Actividad reciente</h2>
            </div>
            <Link to="/proyectos" className="ghost">+ Nuevo proyecto</Link>
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
              </div>
            </Link>
          ))}
          {!isLoading && recientes.length === 0 && (
            <p>Todavía no tenés proyectos — creá el primero desde "Proyectos".</p>
          )}
        </article>
        <article className="panel decision">
          <span className="kicker">CÓMO USAR EL OBSERVATORIO</span>
          <h2>Cada técnica alimenta la misma decisión.</h2>
          <p>Registrá evidencia en persona, journey map, momentos críticos, card sorting y evaluación heurística — y conectalas para argumentar un cambio de diseño.</p>
          {activo && <Link to={`/proyectos/${activo.id.replace(/^\//, '')}`} className="secondary">Abrir proyecto →</Link>}
        </article>
      </section>
    </div>
  );
}
