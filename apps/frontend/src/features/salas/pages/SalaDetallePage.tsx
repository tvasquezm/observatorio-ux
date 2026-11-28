import { SalaBadge } from '../components/SalaBadge';
import { SalaFormDialog } from '../components/SalaFormDialog';
// apps/frontend/src/features/salas/pages/SalaDetallePage.tsx
//
// Detalle de una sala. DOCENTE dueño/ADMIN: tabs "Proyectos" (crear uno
// nuevo alojado en la sala o vincular uno ya existente), "Estudiantes"
// (registro liviano, sin cuenta) y "Equipos" (Fase 4 — toggle +
// CRUD de equipos). ESTUDIANTE: tabs "Proyectos" (solo lectura) y
// "Equipos" (ve los equipos de la sala; si el toggle está activo puede
// crear uno propio y salir del suyo).

import { SalaProjectCreate } from '../../projects/components/SalaProjectCreate';
import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useProjects } from '../../projects/hooks/useProjectsQueries';
import {
  useSala,
  useUpdateSala,
  useEstudiantes,
  useAddEstudiante,
  useAddEstudiantesBulk,
  useRemoveEstudiante,
  useProyectosDeSala,
  useVincularProyecto,
  useDesvincularProyecto,
} from '../hooks/useSalasQueries';
import {
  useEquipos,
  useCreateEquipo,
  useUpdateEquipo,
  useRemoveEquipo,
  useAddMiembroEquipo,
  useRemoveMiembroEquipo,
  useAccesosPendientes,
  useResolverAcceso,
  useHistorialAccesos,
} from '../../equipos/hooks/useEquiposQueries';
import type { Equipo } from '../../equipos/api/equipos.api';
import { SalasApiError, type Sala } from '../api/salas.api';
import { useConfirm } from '../../../shared/api/confirm';
import { useUnsavedChanges } from '../../../shared/hooks/useUnsavedChanges';
import { useDiscardChanges } from '../../../shared/hooks/useDiscardChanges';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { resolvePerspective } from '../../../shared/auth/perspectivas';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { TablaProyectosSala } from '../components/TablaProyectosSala';
import { TecnicasDeLaSala } from '../components/TecnicasDeLaSala';

type DirtyNotice = (dirty: boolean) => void;
function useDirtyNotice(dirty: boolean, onDirtyChange: DirtyNotice) {
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false); }, [dirty, onDirtyChange]);
}

type Tab = 'proyectos' | 'estudiantes' | 'equipos';
type TabEstudiante = 'proyectos' | 'equipos';

export function SalaDetallePage() {
  const [creationDirty, setCreationDirty] = useState(false);
  const [studentsDirty, setStudentsDirty] = useState(false);
  const [teamsDirty, setTeamsDirty] = useState(false);
  const [editandoSala, setEditandoSala] = useState(false);
  const [edicionDirty, setEdicionDirty] = useState(false);
  // El router admite un solo bloqueo: reúne aquí los borradores de los paneles de la sala.
  useUnsavedChanges(true, creationDirty || studentsDirty || teamsDirty || edicionDirty);
  const { salaId } = useParams<{ salaId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const tab: Tab = requestedTab === 'estudiantes' || requestedTab === 'equipos' ? requestedTab : 'proyectos';
  const tabEstudiante: TabEstudiante = requestedTab === 'equipos' ? 'equipos' : 'proyectos';
  const setTab = (nextTab: Tab) => {
    const next = new URLSearchParams(searchParams);
    if (nextTab === 'proyectos') next.delete('tab');
    else next.set('tab', nextTab);
    setSearchParams(next, { replace: true });
  };
  const setTabEstudiante = (nextTab: TabEstudiante) => setTab(nextTab);
  const { user, perspectiveRole } = useAuthStore();
  const activeRole = user ? resolvePerspective(user.rol, perspectiveRole) : null;
  const esEstudiante = activeRole === 'ESTUDIANTE';
  const { data: sala, isLoading, isError, error, refetch } = useSala(salaId ?? null);
  const { mutateAsync: guardarSala } = useUpdateSala(salaId ?? '');
  const actualizacionPermiso = useUpdateSala(salaId ?? '');
  const { reset: reiniciarPermiso } = actualizacionPermiso;
  useEffect(() => reiniciarPermiso(), [salaId, reiniciarPermiso]);

  if (!salaId) return null;

  return (
    <div className="sala-detail-page">
      <Link to="/salas" className="sala-back-link">← Volver a mis salas</Link>

      {isLoading && <Skeleton etiqueta="Cargando sala…" />}
      {isError && (
        <div className="panel sala-access-error" role="alert">
          <h1>{error instanceof SalasApiError && error.status === 403 ? 'No tienes acceso a esta sala' : 'No se pudo abrir la sala'}</h1>
          <p>{(error as Error).message}</p>
          {esEstudiante && error instanceof SalasApiError && error.status === 403 && <p>Solicita la asignación con el correo <strong>{user?.email}</strong>. Puedes volver a tus salas mientras tu docente revisa el acceso.</p>}
          <Link to="/salas" className="secondary button-like">Ver mis salas</Link>{' '}
          <button type="button" className="secondary" onClick={() => refetch()}>Reintentar</button>
        </div>
      )}

      {sala && !isError && (
        <>
          <header className="sala-detail-hero">
            <div>
              <span className="kicker">{esEstudiante ? 'MI SALA' : 'GESTIÓN DE SALA'}</span>
              <h1><SalaBadge id={sala.id} nombre={sala.nombre} /> {sala.nombre}</h1>
              <p>{sala.instrucciones || 'Esta sala todavía no tiene instrucciones.'}</p>
              {!esEstudiante && (activeRole === 'ADMIN' || sala.profesor?.id === user?.id) && (
                <button type="button" className="secondary sala-hero-action" onClick={() => setEditandoSala(true)}>
                  Editar sala
                </button>
              )}
            </div>
            <span className="sala-periodo">{sala.periodo}</span>
            <dl className="sala-detail-meta">
              <div><dt>Docente</dt><dd>{sala.profesor?.nombre ?? 'Sin información'}</dd></div>
              <div><dt>Inicio</dt><dd>{formatearFechaDetalle(sala.fechaInicio)}</dd></div>
              <div><dt>Término</dt><dd>{formatearFechaDetalle(sala.fechaFin)}</dd></div>
            </dl>
          </header>

          {(esEstudiante ? sala.permiteCreacionProyectos : activeRole === 'ADMIN') && <div hidden={(esEstudiante ? tabEstudiante : tab) !== 'proyectos'}><SalaProjectCreate key={salaId} sala={sala} onDirtyChange={setCreationDirty} /></div>}

          {esEstudiante ? (
            <section className="sala-management-panel" aria-labelledby="gestion-sala-title">
              <h2 id="gestion-sala-title" className="sr-only">Contenido de la sala</h2>
              <div className="sala-tabs" role="group" aria-label="Contenido de la sala">
                <button
                  type="button"
                  aria-pressed={tabEstudiante === 'proyectos'}
                  className={tabEstudiante === 'proyectos' ? 'primary' : 'secondary'}
                  onClick={() => setTabEstudiante('proyectos')}
                >
                  Proyectos
                </button>
                <button
                  type="button"
                  aria-pressed={tabEstudiante === 'equipos'}
                  className={tabEstudiante === 'equipos' ? 'primary' : 'secondary'}
                  onClick={() => setTabEstudiante('equipos')}
                >
                  Equipos
                </button>
              </div>

              {tabEstudiante === 'proyectos'
                ? <>
                    {!sala.permiteCreacionProyectos && <p role="note" className="text-muted">Esta sala no permite que los estudiantes creen proyectos. Pídele a tu docente que lo habilite.</p>}
                    <ProyectosDeSalaLectura salaId={salaId} />
                  </>
                : <EquiposDeSalaEstudiante key={salaId} salaId={salaId} sala={sala} onDirtyChange={setTeamsDirty} />}
            </section>
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
                <button
                  type="button"
                  aria-pressed={tab === 'equipos'}
                  className={tab === 'equipos' ? 'primary' : 'secondary'}
                  onClick={() => setTab('equipos')}
                >
                  Equipos
                </button>
              </div>

              {tab === 'proyectos' && <ProyectosDeSala key={salaId} salaId={salaId} sala={sala} actualizacionPermiso={actualizacionPermiso} />}
              {tab === 'estudiantes' && <EstudiantesDeSala key={salaId} salaId={salaId} onDirtyChange={setStudentsDirty} />}
              {tab === 'equipos' && <EquiposDeSalaDocente key={salaId} salaId={salaId} sala={sala} onDirtyChange={setTeamsDirty} />}
            </section>
          )}
        </>
      )}

      {sala && !isError && (
        <SalaFormDialog
          sala={sala}
          abierto={editandoSala}
          onClose={() => setEditandoSala(false)}
          guardar={payload => guardarSala(payload)}
          onDirtyChange={setEdicionDirty}
        />
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
      <p className="text-muted-sm">Puedes consultar los proyectos asignados por tu docente. La gestión de la sala la hace tu docente.</p>

      {isLoading && <Skeleton etiqueta="Cargando proyectos…" variante="lista" />}
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
            {proyecto.esMiembro === false && <span className="sala-readonly-badge">Solo lectura</span>}
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

function ProyectosDeSala({ salaId, sala, actualizacionPermiso }: { salaId: string; sala: Sala; actualizacionPermiso: ReturnType<typeof useUpdateSala> }) {
  const confirm = useConfirm();
  const { data: proyectosSala, isLoading, isError, error, refetch } = useProyectosDeSala(salaId);
  const { data: todosLosProyectos } = useProjects();
  const { mutate: vincular, isPending: vinculando } = useVincularProyecto(salaId);
  const { mutate: desvincular } = useDesvincularProyecto(salaId);
  const { mutate: actualizarSala, isPending: guardandoToggle, isSuccess: guardado, error: saveError, variables } = actualizacionPermiso;

  const [proyectoAVincular, setProyectoAVincular] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [proyectoADesvincular, setProyectoADesvincular] = useState('');
  const termino = busqueda.trim().toLocaleLowerCase('es');
  const visibles = termino ? proyectosSala?.filter((p) => `${p.nombre} ${p.descripcion ?? ''}`.toLocaleLowerCase('es').includes(termino)) : proyectosSala;
  const permiteCreacionProyectos = (guardandoToggle ? variables?.permiteCreacionProyectos : undefined) ?? sala.permiteCreacionProyectos;

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
      <section aria-labelledby="proyectos-sala-titulo">
        <div className="sala-proyectos-cabecera">
          <h3 id="proyectos-sala-titulo">Proyectos de la sala <span className="count">{proyectosSala?.length ?? 0}</span></h3>
          <Link to={`/proyectos?sala=${salaId}`} className="secondary">Ver en Proyectos <span aria-hidden="true">→</span></Link>
        </div>
        {(proyectosSala?.length ?? 0) > 6 && (
          <div className="field sala-proyectos-buscar">
            <label htmlFor="buscar-proyecto-sala">Buscar proyecto en esta sala</label>
            <input id="buscar-proyecto-sala" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre o descripción…" />
          </div>
        )}
      {isLoading && <Skeleton etiqueta="Cargando proyectos…" variante="lista" />}
      {isError && (
        <div className="error-text" role="alert">
          <p>{(error as Error).message}</p>
          <button type="button" className="secondary" onClick={() => refetch()}>Reintentar</button>
        </div>
      )}

      {visibles && visibles.length > 0 && <TablaProyectosSala proyectos={visibles} />}
      {proyectosSala && proyectosSala.length === 0 && <p>Todavía no hay proyectos alojados en esta sala.</p>}
      {proyectosSala && proyectosSala.length > 0 && visibles?.length === 0 && <p className="text-muted">Ningún proyecto coincide con la búsqueda.</p>}
      </section>

      <TecnicasDeLaSala key={(sala.tecnicasAnalizadas ?? []).join()} tecnicasAnalizadas={sala.tecnicasAnalizadas} guardar={actualizacionPermiso} />

      <details className="sala-gestion">
        <summary>Gestionar proyectos de la sala</summary>
        {(proyectosSala?.length ?? 0) > 0 && (
          <div className="form-row-inline sala-desvincular">
            <label className="field">
              Quitar un proyecto de la sala
              <select value={proyectoADesvincular} onChange={(e) => setProyectoADesvincular(e.target.value)}>
                <option value="">Selecciona un proyecto…</option>
                {proyectosSala?.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </label>
            <button type="button" className="secondary" disabled={!proyectoADesvincular} onClick={() => { const p = proyectosSala?.find((x) => x.id === proyectoADesvincular); if (p) void handleDesvincular(p.id, p.nombre).then(() => setProyectoADesvincular('')); }}>Desvincular</button>
          </div>
        )}
      <div className="form-row-inline sala-configuracion">
        <label>
          <input
            type="checkbox"
            checked={permiteCreacionProyectos}
            disabled={guardandoToggle}
            onChange={(e) => actualizarSala({ permiteCreacionProyectos: e.target.checked })}
          />
          Permitir que los estudiantes creen proyectos en esta sala
        </label>
      </div>
      <p role="status">{guardandoToggle ? 'Guardando…' : guardado ? 'Guardado' : ''}</p>
      {saveError && <p role="alert" className="error-text">{saveError.message} La configuración no se guardó. Vuelve a intentarlo.</p>}

      <div className="sala-project-linker">
        <div>
          <h3>Agregar un proyecto a la sala</h3>
          <p>Crea un proyecto en esta sala o vincula uno existente sin sala.</p>
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

      </details>
    </div>
  );
}

// ---------------------------------------------------------------
// Tab Estudiantes
// ---------------------------------------------------------------

function EstudiantesDeSala({ salaId, onDirtyChange }: { salaId: string; onDirtyChange: DirtyNotice }) {
  const confirm = useConfirm();
  const { data: estudiantes, isLoading, isError, error, refetch } = useEstudiantes(salaId);
  const { mutate: agregar, isPending: agregando } = useAddEstudiante(salaId);
  const { mutate: agregarBulk, isPending: agregandoBulk } = useAddEstudiantesBulk(salaId);
  const { mutate: eliminar } = useRemoveEstudiante(salaId);

  const [modo, setModo] = useState<'individual' | 'bulk'>('individual');
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [bulkTexto, setBulkTexto] = useState('');
  useDirtyNotice(Boolean(email || nombre || bulkTexto), onDirtyChange);

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
      <div className="form-row-inline">
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
        <form onSubmit={handleAgregarBulk} className="form-grid form-importar-lista">
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

      {isLoading && <Skeleton etiqueta="Cargando…" variante="lista" />}
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

// ---------------------------------------------------------------
// Tab Equipos — DOCENTE dueño / ADMIN
// ---------------------------------------------------------------

/** Personas que salieron de un equipo y aún ven los proyectos de la sala: el docente decide si conservan el acceso. */
function AccesosPendientes({ salaId }: { salaId: string }) {
  const { data: pendientes } = useAccesosPendientes(salaId);
  const { mutate: resolver, isPending } = useResolverAcceso(salaId);
  const confirm = useConfirm();
  const [verHistorial, setVerHistorial] = useState(false);
  const { data: historial } = useHistorialAccesos(salaId, verHistorial);
  const bloqueHistorial = (
    <details onToggle={(e) => setVerHistorial(e.currentTarget.open)}>
      <summary>Decisiones anteriores</summary>
      {historial && historial.length === 0 && <p className="text-muted-sm">Aún no has resuelto ningún acceso.</p>}
      <ul className="list-stack">
        {historial?.map((h) => (
          <li key={h.id} className="text-muted-sm">
            <strong>{h.usuario.nombre}</strong> · {h.decision === 'QUITADO' ? 'Se quitó el acceso' : 'Se mantuvo el acceso'} el {new Date(h.resueltoEn).toLocaleDateString('es-CL')}
            {h.resueltoPorNombre ? ` por ${h.resueltoPorNombre}` : ''} · salió de «{h.equipoNombre}»
          </li>
        ))}
      </ul>
    </details>
  );
  if (!pendientes?.length) return <section className="panel sala-accesos-pendientes sala-accesos-historial">{bloqueHistorial}</section>;

  async function quitar(id: string, nombre: string) {
    if (await confirm(`¿Quitar a ${nombre} el acceso a los proyectos de la sala? Dejará de verlos.`)) resolver({ revisionId: id, decision: 'QUITAR' });
  }

  return (
    <section className="panel sala-accesos-pendientes" aria-labelledby="accesos-pendientes-titulo">
      <div className="panel-head">
        <div><span className="kicker">REQUIERE TU DECISIÓN</span><h3 id="accesos-pendientes-titulo">Accesos pendientes de revisión</h3></div>
        <span className="count">{pendientes.length}</span>
      </div>
      <p className="text-muted-sm">Salieron de un equipo y siguen viendo los proyectos de la sala hasta que decidas.</p>
      <ul className="list-stack">
        {pendientes.map((p) => (
          <li key={p.id} className="entity-card">
            <div>
              <strong>{p.usuario.nombre}</strong>
              <p className="text-muted-sm">{p.usuario.email} · salió de «{p.equipoNombre}» el {new Date(p.createdAt).toLocaleDateString('es-CL')}</p>
            </div>
            <div className="sala-accesos-acciones">
              <button type="button" className="secondary" disabled={isPending} onClick={() => resolver({ revisionId: p.id, decision: 'MANTENER' })}>
                Mantener acceso <span className="sr-only">de {p.usuario.nombre}</span>
              </button>
              <button type="button" className="danger" disabled={isPending} onClick={() => void quitar(p.id, p.usuario.nombre)}>
                Quitar acceso <span className="sr-only">de {p.usuario.nombre}</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
      {bloqueHistorial}
    </section>
  );
}

function EquiposDeSalaDocente({ salaId, sala, onDirtyChange }: { salaId: string; sala: Sala; onDirtyChange: DirtyNotice }) {
  // El docente forma los equipos agregando integrantes; eliminarlos o sacar a alguien lo hacen los estudiantes.
  const puedeQuitar = useAuthStore((st) => (st.user ? resolvePerspective(st.user.rol, st.perspectiveRole) : null)) !== 'DOCENTE';
  const confirm = useConfirm();
  const { data: equipos, isLoading, isError, error, refetch } = useEquipos(salaId);
  const { mutate: actualizarSala, isPending: guardandoToggle, isSuccess: guardado, error: saveError } = useUpdateSala(salaId);
  const { mutate: crearEquipo, isPending: creando } = useCreateEquipo(salaId);
  const { mutate: renombrarEquipo, isPending: renombrando } = useUpdateEquipo(salaId);
  const { mutate: eliminarEquipo } = useRemoveEquipo(salaId);
  const { mutate: agregarMiembro } = useAddMiembroEquipo(salaId);
  const { mutate: quitarMiembro } = useRemoveMiembroEquipo(salaId);

  const [permiteCreacion, setPermiteCreacion] = useState(sala.permiteCreacionEquipos);
  const [limite, setLimite] = useState(
    sala.limiteIntegrantesEquipo != null ? String(sala.limiteIntegrantesEquipo) : '',
  );
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [equipoRenombrando, setEquipoRenombrando] = useState<string | null>(null);
  const [nombreRenombrado, setNombreRenombrado] = useState('');
  const { confirmDiscard } = useDiscardChanges(equipoRenombrando !== null, nombreRenombrado, renombrando, equipoRenombrando ?? undefined);
  const [emailPorEquipo, setEmailPorEquipo] = useState<Record<string, string>>({});
  useEffect(() => {
    setPermiteCreacion(sala.permiteCreacionEquipos);
    setLimite(sala.limiteIntegrantesEquipo != null ? String(sala.limiteIntegrantesEquipo) : '');
  }, [sala.permiteCreacionEquipos, sala.limiteIntegrantesEquipo]);
  const configChanged = permiteCreacion !== sala.permiteCreacionEquipos || limite !== (sala.limiteIntegrantesEquipo != null ? String(sala.limiteIntegrantesEquipo) : '');
  const renameChanged = equipoRenombrando !== null && nombreRenombrado !== equipos?.find(e => e.id === equipoRenombrando)?.nombre;
  useDirtyNotice(configChanged || Boolean(nombreEquipo) || renameChanged || Object.values(emailPorEquipo).some(Boolean), onDirtyChange);


  function handleGuardarToggle(e: React.FormEvent) {
    e.preventDefault();
    const limiteNum = limite.trim() ? Number(limite) : null;
    actualizarSala({
      permiteCreacionEquipos: permiteCreacion,
      limiteIntegrantesEquipo: limiteNum,
    }, { onError: () => {
      setPermiteCreacion(sala.permiteCreacionEquipos);
      setLimite(sala.limiteIntegrantesEquipo != null ? String(sala.limiteIntegrantesEquipo) : '');
    } });
  }

  function handleCrearEquipo(e: React.FormEvent) {
    e.preventDefault();
    const limpio = nombreEquipo.trim();
    if (!limpio) return;
    crearEquipo(limpio, { onSuccess: () => setNombreEquipo('') });
  }

  async function iniciarRenombrar(equipo: Equipo) {
    if (!(await confirmDiscard())) return;
    setEquipoRenombrando(equipo.id);
    setNombreRenombrado(equipo.nombre);
  }

  function guardarRenombrar(equipoId: string) {
    const limpio = nombreRenombrado.trim();
    if (!limpio) return;
    renombrarEquipo(
      { equipoId, nombre: limpio },
      { onSuccess: () => setEquipoRenombrando(null) },
    );
  }

  async function handleEliminarEquipo(equipoId: string, nombre: string) {
    if (await confirm(`¿Eliminar el equipo "${nombre}"? Esto no se puede deshacer.`, { requireText: nombre })) {
      eliminarEquipo(equipoId);
    }
  }

  function handleAgregarMiembro(e: React.FormEvent, equipoId: string) {
    e.preventDefault();
    const email = (emailPorEquipo[equipoId] ?? '').trim();
    if (!email) return;
    agregarMiembro(
      { equipoId, email },
      { onSuccess: () => setEmailPorEquipo((prev) => ({ ...prev, [equipoId]: '' })) },
    );
  }

  async function handleQuitarMiembro(equipoId: string, usuarioId: string, nombre: string) {
    if (await confirm(`¿Quitar a "${nombre}" del equipo?`)) {
      quitarMiembro({ equipoId, usuarioId });
    }
  }

  return (
    <div>
      <AccesosPendientes salaId={salaId} />
      <form onSubmit={handleGuardarToggle} className="form-row-inline sala-configuracion">
        <label>
          <input
            type="checkbox"
            checked={permiteCreacion}
            disabled={guardandoToggle}
            onChange={(e) => setPermiteCreacion(e.target.checked)}
          />
          Permitir que los estudiantes creen sus propios equipos
        </label>
        <label className="field">
          Límite de integrantes (vacío = sin límite)
          <input
            type="number"
            disabled={guardandoToggle}
            min={1}
            value={limite}
            onChange={(e) => setLimite(e.target.value)}
            className="input-flex sala-limite-integrantes"
          />
        </label>
        <button type="submit" className="primary" disabled={guardandoToggle}>
          {guardandoToggle ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </form>
      <p role="status">{guardandoToggle ? 'Guardando…' : configChanged ? 'Cambios sin guardar' : guardado ? 'Guardado' : ''}</p>
      {saveError && <p role="alert" className="error-text">{saveError.message} La configuración no se guardó.</p>}

      <form onSubmit={handleCrearEquipo} className="form-row-inline">
        <input
          type="text"
          placeholder="Nombre del nuevo equipo"
          aria-label="Nombre del nuevo equipo"
          value={nombreEquipo}
          onChange={(e) => setNombreEquipo(e.target.value)}
          required
          className="input-flex"
        />
        <button type="submit" className="primary" disabled={creando}>
          {creando ? 'Creando…' : '+ Crear equipo'}
        </button>
      </form>

      {isLoading && <Skeleton etiqueta="Cargando equipos…" variante="lista" />}
      {isError && (
        <div className="error-text" role="alert">
          <p>{(error as Error).message}</p>
          <button type="button" className="secondary" onClick={() => refetch()}>Reintentar</button>
        </div>
      )}

      <div className="list-stack mt-16">
        {equipos?.map((equipo) => (
          <div key={equipo.id} className="entity-card">
            <div className="sala-equipo-detalle">
              {equipoRenombrando === equipo.id ? (
                <div className="form-row-inline">
                  <input
                    type="text"
                    aria-label="Renombrar equipo"
                    value={nombreRenombrado}
                    onChange={(e) => setNombreRenombrado(e.target.value)}
                    className="input-flex"
                  />
                  <button type="button" className="primary" onClick={() => guardarRenombrar(equipo.id)}>
                    Guardar
                  </button>
                  <button type="button" className="secondary" onClick={async () => {
                    if (await confirmDiscard()) setEquipoRenombrando(null);
                  }}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="row-between">
                  <b>{equipo.nombre}</b>
                  <div className="form-row-inline">
                    <button type="button" className="link-btn link-btn--edit" onClick={() => iniciarRenombrar(equipo)}>
                      Renombrar
                    </button>
                    {puedeQuitar && (
  <button
                        type="button"
                        className="link-btn link-btn--delete"
                        onClick={() => handleEliminarEquipo(equipo.id, equipo.nombre)}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="list-stack mt-16">
                {equipo.miembros.map((m) => (
                  <div key={m.usuarioId} className="row-between text-muted-sm">
                    <span>{m.usuario.nombre} ({m.usuario.email})</span>
                    {puedeQuitar && (
  <button
                        type="button"
                        className="link-btn link-btn--delete"
                        onClick={() => handleQuitarMiembro(equipo.id, m.usuarioId, m.usuario.nombre)}
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                ))}
                {equipo.miembros.length === 0 && <p className="text-muted-sm">Sin integrantes todavía.</p>}
              </div>

              <form
                onSubmit={(e) => handleAgregarMiembro(e, equipo.id)}
                className="form-row-inline mt-16"
              >
                <input
                  type="email"
                  placeholder="Email del estudiante a agregar"
                  aria-label="Email del estudiante a agregar"
                  value={emailPorEquipo[equipo.id] ?? ''}
                  onChange={(e) =>
                    setEmailPorEquipo((prev) => ({ ...prev, [equipo.id]: e.target.value }))
                  }
                  required
                  className="input-flex"
                />
                <button type="submit" className="secondary">+ Agregar integrante</button>
              </form>
            </div>
          </div>
        ))}
        {equipos && equipos.length === 0 && <p>Todavía no hay equipos en esta sala.</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Tab Equipos — ESTUDIANTE
// ---------------------------------------------------------------

function EquiposDeSalaEstudiante({ salaId, sala, onDirtyChange }: { salaId: string; sala: Sala; onDirtyChange: DirtyNotice }) {
  const confirm = useConfirm();
  const currentUser = useAuthStore((s) => s.user);
  const { data: equipos, isLoading, isError, error, refetch } = useEquipos(salaId);
  const { mutate: crearEquipo, isPending: creando } = useCreateEquipo(salaId);
  const { mutate: quitarMiembro } = useRemoveMiembroEquipo(salaId);

  const [nombreEquipo, setNombreEquipo] = useState('');
  useDirtyNotice(Boolean(nombreEquipo), onDirtyChange);

  const miEquipo = equipos?.find((eq) =>
    eq.miembros.some((m) => m.usuarioId === currentUser?.id),
  );

  function handleCrearEquipo(e: React.FormEvent) {
    e.preventDefault();
    const limpio = nombreEquipo.trim();
    if (!limpio) return;
    crearEquipo(limpio, { onSuccess: () => setNombreEquipo('') });
  }

  async function handleSalir(equipoId: string) {
    if (!currentUser) return;
    if (await confirm('¿Salir de este equipo?')) {
      quitarMiembro({ equipoId, usuarioId: currentUser.id });
    }
  }

  return (
    <section className="sala-student-panel" aria-labelledby="equipos-sala-title">
      <div className="sala-section-head">
        <div>
          <span className="kicker">CONTENIDO</span>
          <h2 id="equipos-sala-title">Equipos de la sala</h2>
        </div>
        <span className="count">{equipos?.length ?? 0} en total</span>
      </div>

      {!miEquipo && sala.permiteCreacionEquipos && (
        <form onSubmit={handleCrearEquipo} className="form-row-inline">
          <input
            type="text"
            placeholder="Nombre de tu nuevo equipo"
            aria-label="Nombre de tu nuevo equipo"
            value={nombreEquipo}
            onChange={(e) => setNombreEquipo(e.target.value)}
            required
            className="input-flex"
          />
          <button type="submit" className="primary" disabled={creando}>
            {creando ? 'Creando…' : '+ Crear mi equipo'}
          </button>
        </form>
      )}
      {!miEquipo && !sala.permiteCreacionEquipos && (
        <p className="text-muted-sm">Tu docente todavía no habilitó la creación de equipos por estudiantes.</p>
      )}

      {isLoading && <Skeleton etiqueta="Cargando equipos…" variante="lista" />}
      {isError && (
        <div className="error-text" role="alert">
          <p>{(error as Error).message}</p>
          <button type="button" className="secondary" onClick={() => refetch()}>Reintentar</button>
        </div>
      )}

      <div className="list-stack mt-16">
        {equipos?.map((equipo) => {
          const esMiEquipo = equipo.id === miEquipo?.id;
          return (
            <article key={equipo.id} className="entity-card">
              <div className="sala-equipo-detalle">
                <div className="row-between">
                  <b>{equipo.nombre}</b>
                  {esMiEquipo && (
                    <button type="button" className="link-btn link-btn--delete" onClick={() => handleSalir(equipo.id)}>
                      Salir del equipo
                    </button>
                  )}
                </div>
                <div className="text-muted-sm">
                  {equipo.miembros.map((m) => m.usuario.nombre).join(', ') || 'Sin integrantes todavía.'}
                </div>
              </div>
            </article>
          );
        })}
        {equipos && equipos.length === 0 && (
          <div className="salas-empty">
            <p>Esta sala todavía no tiene equipos.</p>
          </div>
        )}
      </div>
    </section>
  );
}
