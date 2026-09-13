// apps/frontend/src/features/salas/pages/SalaDetallePage.tsx
//
// Detalle de una sala: tab "Proyectos" (crear uno nuevo alojado en la sala
// o vincular uno ya existente del profesor) y tab "Estudiantes" (registro
// liviano, sin cuenta — alta individual o masiva pegando una lista).

import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useProjects } from '../../projects/hooks/useProjectsQueries';
import {
  useSala,
  useEstudiantes,
  useAddEstudiante,
  useAddEstudiantesBulk,
  useRemoveEstudiante,
  useProyectosDeSala,
  useVincularProyecto,
  useDesvincularProyecto,
} from '../hooks/useSalasQueries';
import { useConfirm } from '../../../shared/api/confirm';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { resolvePerspective } from '../../../shared/auth/perspectivas';

type Tab = 'proyectos' | 'estudiantes';

export function SalaDetallePage() {
  const { salaId } = useParams<{ salaId: string }>();
  const [tab, setTab] = useState<Tab>('proyectos');
  const { user, perspectiveRole } = useAuthStore();
  const activeRole = user ? resolvePerspective(user.rol, perspectiveRole) : null;
  const esEstudiante = activeRole === 'ESTUDIANTE';
  const { data: sala, isLoading, isError, error, refetch } = useSala(salaId ?? null);

  if (!salaId) return null;

  return (
    <div className="sala-detail-page">
      <Link to="/salas" className="sala-back-link">← Volver a mis salas</Link>

      {isLoading && <p className="text-muted">Cargando sala…</p>}
      {isError && (
        <div className="sala-form-error" role="alert">
          <p>{(error as Error).message}</p>
          <button type="button" className="secondary" onClick={() => refetch()}>Reintentar</button>
        </div>
      )}

      {sala && (
        <>
          <header className="sala-detail-hero">
            <div>
              <span className="kicker">{esEstudiante ? 'MI SALA' : 'GESTIÓN DE SALA'}</span>
              <h1>{sala.nombre}</h1>
              <p>{sala.instrucciones || 'Esta sala todavía no tiene instrucciones.'}</p>
            </div>
            <span className="sala-periodo">{sala.periodo}</span>
            <dl className="sala-detail-meta">
              <div><dt>Docente</dt><dd>{sala.profesor?.nombre ?? 'Sin información'}</dd></div>
              <div><dt>Inicio</dt><dd>{formatearFechaDetalle(sala.fechaInicio)}</dd></div>
              <div><dt>Término</dt><dd>{formatearFechaDetalle(sala.fechaFin)}</dd></div>
            </dl>
          </header>

          {esEstudiante ? (
            <ProyectosDeSalaLectura salaId={salaId} />
          ) : (
            <section className="sala-management-panel" aria-labelledby="gestion-sala-title">
              <h2 id="gestion-sala-title" className="sr-only">Gestión de la sala</h2>
              <div className="sala-tabs" role="group" aria-label="Contenido de la sala">
                <button
                  type="button"
                  aria-pressed={tab === 'proyectos'}
                  className={tab === 'proyectos' ? 'primary' : 'secondary'}
                  onClick={() => setTab('proyectos')}
                >
                  Proyectos
                </button>
                <button
                  type="button"
                  aria-pressed={tab === 'estudiantes'}
                  className={tab === 'estudiantes' ? 'primary' : 'secondary'}
                  onClick={() => setTab('estudiantes')}
                >
                  Estudiantes
                </button>
              </div>

              {tab === 'proyectos'
                ? <ProyectosDeSala salaId={salaId} />
                : <EstudiantesDeSala salaId={salaId} />}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function formatearFechaDetalle(fechaRaw?: string | null) {
  if (!fechaRaw) return 'Sin definir';
  const fecha = new Date(fechaRaw);
  if (Number.isNaN(fecha.getTime())) return 'Sin definir';
  return fecha.toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ProyectosDeSalaLectura({ salaId }: { salaId: string }) {
  const { data: proyectos, isLoading, isError, error, refetch } = useProyectosDeSala(salaId);

  return (
    <section className="sala-student-panel" aria-labelledby="proyectos-sala-title">
      <div className="sala-section-head">
        <div>
          <span className="kicker">CONTENIDO</span>
          <h2 id="proyectos-sala-title">Proyectos de la sala</h2>
        </div>
        <span className="count">{proyectos?.length ?? 0} en total</span>
      </div>
      <p className="text-muted-sm">Puedes consultar los proyectos asignados por tu docente. La gestión de la sala es solo de lectura para estudiantes.</p>

      {isLoading && <p>Cargando proyectos…</p>}
      {isError && (
        <div className="error-text" role="alert">
          <p>{(error as Error).message}</p>
          <button type="button" className="secondary" onClick={() => refetch()}>Reintentar</button>
        </div>
      )}
      <div className="list-stack">
        {proyectos?.map((proyecto) => (
          <article key={proyecto.id} className="entity-card sala-project-readonly">
            <div>
              <h3>{proyecto.nombre}</h3>
              <p>{proyecto.descripcion || 'Sin descripción.'}</p>
            </div>
            <span className="sala-readonly-badge">Solo lectura</span>
          </article>
        ))}
        {proyectos && proyectos.length === 0 && (
          <div className="salas-empty">
            <p>Esta sala todavía no tiene proyectos asignados.</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// Tab Proyectos
// ---------------------------------------------------------------

function ProyectosDeSala({ salaId }: { salaId: string }) {
  const confirm = useConfirm();
  const { data: proyectosSala, isLoading, isError, error, refetch } = useProyectosDeSala(salaId);
  const { data: todosLosProyectos } = useProjects();
  const { mutate: vincular, isPending: vinculando } = useVincularProyecto(salaId);
  const { mutate: desvincular } = useDesvincularProyecto(salaId);

  const [proyectoAVincular, setProyectoAVincular] = useState('');

  // Solo se pueden vincular proyectos que todavía no están en ninguna sala.
  const disponiblesParaVincular = (todosLosProyectos ?? []).filter(
    (p) => !proyectosSala?.some((ps) => ps.id === p.id) && !p.salaId,
  );

  function handleVincular(e: React.FormEvent) {
    e.preventDefault();
    if (!proyectoAVincular) return;
    vincular(proyectoAVincular, { onSuccess: () => setProyectoAVincular('') });
  }

  async function handleDesvincular(id: string, nombreProyecto: string) {
    if (await confirm(`¿Desvincular el proyecto “${nombreProyecto}” de esta sala?`)) {
      desvincular(id);
    }
  }

  return (
    <div>
      <div className="sala-project-linker">
        <div>
          <h3>Agregar un proyecto a la sala</h3>
          <p>Los proyectos se crean una sola vez desde Proyectos y luego se vinculan aquí.</p>
        </div>
        <form onSubmit={handleVincular} className="form-row-inline sala-project-link-form">
          <label className="field">
            Proyecto existente
            <select
              value={proyectoAVincular}
              onChange={(e) => setProyectoAVincular(e.target.value)}
              required
            >
              <option value="">Selecciona un proyecto…</option>
              {disponiblesParaVincular.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="primary" disabled={vinculando || !proyectoAVincular}>
            {vinculando ? 'Vinculando…' : 'Vincular proyecto'}
          </button>
        </form>
        {disponiblesParaVincular.length === 0 && (
          <Link to="/proyectos" className="secondary sala-projects-link">Ir a Proyectos →</Link>
        )}
      </div>

      {isLoading && <p>Cargando proyectos…</p>}
      {isError && (
        <div className="error-text" role="alert">
          <p>{(error as Error).message}</p>
          <button type="button" className="secondary" onClick={() => refetch()}>Reintentar</button>
        </div>
      )}

      <div className="list-stack">
        {proyectosSala?.map((p) => (
          <div key={p.id} className="entity-card row-between">
            <div>
              <b>{p.nombre}</b>
              {p.descripcion && <div className="text-muted-sm">{p.descripcion}</div>}
            </div>
            <button
              type="button"
              className="secondary"
              onClick={() => handleDesvincular(p.id, p.nombre)}
            >
              Desvincular
            </button>
          </div>
        ))}
        {proyectosSala && proyectosSala.length === 0 && (
          <p>Todavía no hay proyectos alojados en esta sala.</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Tab Estudiantes
// ---------------------------------------------------------------

function EstudiantesDeSala({ salaId }: { salaId: string }) {
  const confirm = useConfirm();
  const { data: estudiantes, isLoading, isError, error, refetch } = useEstudiantes(salaId);
  const { mutate: agregar, isPending: agregando } = useAddEstudiante(salaId);
  const { mutate: agregarBulk, isPending: agregandoBulk } = useAddEstudiantesBulk(salaId);
  const { mutate: eliminar } = useRemoveEstudiante(salaId);

  const [modo, setModo] = useState<'individual' | 'bulk'>('individual');
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [bulkTexto, setBulkTexto] = useState('');

  function handleAgregarIndividual(e: React.FormEvent) {
    e.preventDefault();
    const limpio = email.trim();
    if (!limpio) return;
    agregar(
      { email: limpio, nombre: nombre.trim() || undefined },
      { onSuccess: () => { setEmail(''); setNombre(''); } },
    );
  }

  function handleAgregarBulk(e: React.FormEvent) {
    e.preventDefault();
    // Una línea por estudiante: "email" o "email, nombre".
    const entradas = bulkTexto
      .split('\n')
      .map((linea) => linea.trim())
      .filter(Boolean)
      .map((linea) => {
        const [emailCrudo, ...resto] = linea.split(',');
        return { email: emailCrudo.trim(), nombre: resto.join(',').trim() || undefined };
      })
      .filter((e) => e.email.length > 0);

    if (entradas.length === 0) return;
    agregarBulk(entradas, { onSuccess: () => setBulkTexto('') });
  }

  async function handleEliminar(id: string, nombreVisible: string) {
    if (await confirm(`¿Quitar a “${nombreVisible}” de esta sala?`)) eliminar(id);
  }

  return (
    <div>
      <div className="form-row-inline" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={modo === 'individual' ? 'primary' : 'secondary'}
          onClick={() => setModo('individual')}
        >
          Agregar uno
        </button>
        <button
          type="button"
          className={modo === 'bulk' ? 'primary' : 'secondary'}
          onClick={() => setModo('bulk')}
        >
          Agregar varios
        </button>
      </div>

      {modo === 'individual' && (
        <form onSubmit={handleAgregarIndividual} className="form-row-inline">
          <input
            type="email"
            aria-label="Email del estudiante"
            placeholder="Email del estudiante"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-flex"
          />
          <input
            type="text"
            aria-label="Nombre del estudiante"
            placeholder="Nombre (opcional)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="input-flex"
          />
          <button type="submit" className="primary" disabled={agregando}>
            {agregando ? 'Agregando…' : '+ Agregar'}
          </button>
        </form>
      )}

      {modo === 'bulk' && (
        <form onSubmit={handleAgregarBulk} className="form-grid" style={{ maxWidth: 480 }}>
          <label className="field">
            Un estudiante por línea — <code>email</code> o <code>email, nombre</code>
            <textarea
              placeholder={'ana@utem.cl\nbruno@utem.cl, Bruno Soto'}
              value={bulkTexto}
              aria-label="Lista de estudiantes"
              onChange={(e) => setBulkTexto(e.target.value)}
              className="textarea-md"
            />
          </label>
          <button type="submit" className="primary" disabled={agregandoBulk}>
            {agregandoBulk ? 'Agregando…' : '+ Agregar lista'}
          </button>
        </form>
      )}

      {isLoading && <p>Cargando…</p>}
      {isError && (
        <div className="error-text" role="alert">
          <p>{(error as Error).message}</p>
          <button type="button" className="secondary" onClick={() => refetch()}>Reintentar</button>
        </div>
      )}

      <div className="list-stack mt-16">
        {estudiantes?.map((e) => (
          <div key={e.id} className="entity-card row-between">
            <div>
              <b>{e.nombre ?? e.email}</b>
              {e.nombre && <div className="text-muted-sm">{e.email}</div>}
            </div>
            <button
              type="button"
              className="secondary danger"
              onClick={() => handleEliminar(e.id, e.nombre ?? e.email)}
            >
              Quitar
            </button>
          </div>
        ))}
        {estudiantes && estudiantes.length === 0 && (
          <p>Todavía no hay estudiantes registrados en esta sala.</p>
        )}
      </div>
    </div>
  );
}
