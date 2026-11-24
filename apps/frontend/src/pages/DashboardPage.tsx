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
import { Icon } from '../shared/components/ui/Icon';
import { PanelContinuar } from '../features/analitica-proyecto/PanelContinuar';
import { VideoTutorial } from '../shared/components/VideoTutorial';
import { Skeleton } from '../shared/components/ui/Skeleton';

const TECHNIQUES = [
  { to: 'personas', label: 'Personas', icon: 'personas', cls: 'c2' },
  { to: 'journey-map', label: 'Journey Map', icon: 'journey', cls: 'c4' },
  { to: 'momentos-criticos', label: 'Momentos críticos', icon: 'momentos', cls: 'c5' },
  { to: 'card-sorting', label: 'Card Sorting', icon: 'card-sorting', cls: 'c1' },
  { to: 'evaluacion-heuristica', label: 'Evaluación heurística', icon: 'heuristica', cls: 'c3' },
] as const;

const SIN_SALA = '__sin-sala__';

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
  // Filtro por sala: solo aparece cuando los proyectos están repartidos en más de una sala.
  const [salaFiltro, setSalaFiltro] = useState('');
  const gruposSala = new Set((proyectos ?? []).map(p => p.salaId ?? SIN_SALA));
  const mostrarFiltroSala = gruposSala.size > 1;
  const opcionesSala = [...gruposSala].map(id => ({ id, nombre: id === SIN_SALA ? 'Sin sala' : salas?.find(s => s.id === id)?.nombre ?? 'Sala sin nombre' }))
    .sort((a, b) => (a.id === SIN_SALA ? 1 : b.id === SIN_SALA ? -1 : a.nombre.localeCompare(b.nombre, 'es')));
  const enSala = (id: string) => (proyectos ?? []).filter(p => !id || (p.salaId ?? SIN_SALA) === id);
  const conteoSala = (id: string) => enSala(id).length;
  const nombreSala = (id?: string | null) => opcionesSala.find(o => o.id === (id ?? SIN_SALA))?.nombre ?? 'Sin sala';
  const visibles = enSala(salaFiltro);
  const [busqueda, setBusqueda] = useState('');
  const termino = busqueda.trim().toLocaleLowerCase('es');
  const mostrados = termino ? visibles.filter(p => p.nombre.toLocaleLowerCase('es').includes(termino)) : visibles;
  const activo = visibles.find(p => p.id === selectedId) ?? (visibles.length === 1 ? visibles[0] : null);
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
        <VideoTutorial />
      </section>

      <section className="panel active-project" aria-labelledby="paso-proyecto">
        <h2 id="paso-proyecto" className="step-title"><span className="step-num" aria-hidden="true">1</span> Proyecto</h2>
        {isError ? <div role="alert"><p>No pudimos cargar tus proyectos. Comprueba tu conexión y vuelve a intentarlo.</p><button type="button" className="secondary" onClick={() => void refetch()}>Reintentar</button></div> : isLoading ? <Skeleton etiqueta="Cargando proyectos…" variante="tarjetas" /> : total > 0 ? <>
          {mostrarFiltroSala && (
            <div className="inicio-salas" role="group" aria-label="Sala">
              {[{ id: '', nombre: 'Todas las salas' }, ...opcionesSala].map(o => (
                <button key={o.id || 'todas'} type="button" className="inicio-sala" aria-pressed={salaFiltro === o.id} onClick={() => setSalaFiltro(o.id)}>
                  {o.nombre}{' '}<span className="inicio-sala-cuenta">{conteoSala(o.id)}<span className="sr-only"> proyecto{conteoSala(o.id) === 1 ? '' : 's'}</span></span>
                </button>
              ))}
            </div>
          )}
          {(proyectos?.length ?? 0) > 6 && (
            <label className="inicio-buscar">
              <span className="sr-only">Buscar proyecto</span>
              <Icon name="search" />
              <input type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar proyecto…" />
            </label>
          )}
          <div className="inicio-proyectos" role="radiogroup" aria-label="Proyecto activo">
            {mostrados.map(p => (
              <button key={p.id} type="button" role="radio" aria-checked={activo?.id === p.id} className="inicio-proyecto" onClick={() => chooseProject(activo?.id === p.id ? '' : p.id)}>
                <strong>{p.nombre}</strong>
                {mostrarFiltroSala && <small>{nombreSala(p.salaId)}</small>}
                {p.descripcion && <span>{p.descripcion}</span>}
              </button>
            ))}
            {mostrados.length === 0 && <p className="text-muted">{busqueda ? 'Ningún proyecto coincide con la búsqueda.' : 'No hay proyectos en esta sala.'}</p>}
          </div>
          <div className="inicio-proyectos-pie">
            <p className="text-muted">{activo ? <>Trabajarás en <strong>{activo.nombre}</strong>.</> : 'Selecciona un proyecto para abrir sus técnicas.'}</p>
            <Link to="/proyectos" className="ghost">Todos los proyectos</Link>
          </div>
        </> : <><p>Todavía no tienes proyectos.</p><Link to="/proyectos" className="primary">Crear tu primer proyecto</Link></>}
      </section>

      {activo && <PanelContinuar proyectoId={activo.id} />}

      <h2 id="paso-tecnica" className="step-title"><span className="step-num" aria-hidden="true">2</span> Técnica</h2>
      <section className="techniques" aria-labelledby="paso-tecnica">
        {TECHNIQUES.map((t) => (
          <Link
            key={t.to}
            to={activo ? `/proyectos/${activo.id.replace(/^\//, '')}/${t.to}` : '/proyectos'}
            className={`tech-card rise ${t.cls}`}
          >
            <span className="tech-glyph" aria-hidden="true"><Icon name={t.icon} /></span>
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
          {isLoadingSalas && <Skeleton etiqueta="Cargando…" variante="lista" cantidad={2} />}
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
