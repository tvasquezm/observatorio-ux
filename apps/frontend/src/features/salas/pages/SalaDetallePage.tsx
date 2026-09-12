// apps/frontend/src/features/salas/pages/SalaDetallePage.tsx
//
// Detalle de una sala. DOCENTE dueño/ADMIN: tabs "Proyectos" (crear uno
// nuevo alojado en la sala o vincular uno ya existente), "Estudiantes"
// (registro liviano, sin cuenta) y "Equipos" (Fase 4 — toggle +
// CRUD de equipos). ESTUDIANTE: tabs "Proyectos" (solo lectura) y
// "Equipos" (ve los equipos de la sala; si el toggle está activo puede
// crear uno propio y salir del suyo).

import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
} from '../../equipos/hooks/useEquiposQueries';
import type { Equipo } from '../../equipos/api/equipos.api';
import type { Sala } from '../api/salas.api';
import { useConfirm } from '../../../shared/api/confirm';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { resolvePerspective } from '../../../shared/auth/perspectivas';

type Tab = 'proyectos' | 'estudiantes' | 'equipos';
type TabEstudiante = 'proyectos' | 'equipos';

export function SalaDetallePage() {
  const { salaId } = useParams<{ salaId: string }>();
  const [tab, setTab] = useState<Tab>('proyectos');
  const [tabEstudiante, setTabEstudiante] = useState<TabEstudiante>('proyectos');
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
                ? <ProyectosDeSalaLectura salaId={salaId} />
                : <EquiposDeSalaEstudiante salaId={salaId} sala={sala} />}
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

              {tab === 'proyectos' && <ProyectosDeSala salaId={salaId} />}
              {tab === 'estudiantes' && <EstudiantesDeSala salaId={salaId} />}
              {tab === 'equipos' && <EquiposDeSalaDocente salaId={salaId} sala={sala} />}
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

// ---------------------------------------------------------------
// Tab Equipos — DOCENTE dueño / ADMIN
// ---------------------------------------------------------------

function EquiposDeSalaDocente({ salaId, sala }: { salaId: string; sala: Sala }) {
  const confirm = useConfirm();
  const { data: equipos, isLoading, isError, error, refetch } = useEquipos(salaId);
  const { mutate: actualizarSala, isPending: guardandoToggle } = useUpdateSala(salaId);
  const { mutate: crearEquipo, isPending: creando } = useCreateEquipo(salaId);
  const { mutate: renombrarEquipo } = useUpdateEquipo(salaId);
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
  const [emailPorEquipo, setEmailPorEquipo] = useState<Record<string, string>>({});

  function handleGuardarToggle(e: React.FormEvent) {
    e.preventDefault();
    const limiteNum = limite.trim() ? Number(limite) : undefined;
    actualizarSala({
      permiteCreacionEquipos: permiteCreacion,
      ...(limiteNum !== undefined ? { limiteIntegrantesEquipo: limiteNum } : {}),
    });
  }

  function handleCrearEquipo(e: React.FormEvent) {
    e.preventDefault();
    const limpio = nombreEquipo.trim();
    if (!limpio) return;
    crearEquipo(limpio, { onSuccess: () => setNombreEquipo('') });
  }

  function iniciarRenombrar(equipo: Equipo) {
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
    if (await confirm(`¿Eliminar el equipo "${nombre}"? Esto no se puede deshacer.`)) {
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
      <form onSubmit={handleGuardarToggle} className="form-row-inline" style={{ marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={permiteCreacion}
            onChange={(e) => setPermiteCreacion(e.target.checked)}
          />
          Permitir que los estudiantes creen sus propios equipos
        </label>
        <label className="field">
          Límite de integrantes (vacío = sin límite)
          <input
            type="number"
            min={1}
            value={limite}
            onChange={(e) => setLimite(e.target.value)}
            className="input-flex"
            style={{ maxWidth: 120 }}
          />
        </label>
        <button type="submit" className="primary" disabled={guardandoToggle}>
          {guardandoToggle ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </form>

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

      {isLoading && <p>Cargando equipos…</p>}
      {isError && (
        <div className="error-text" role="alert">
          <p>{(error as Error).message}</p>
          <button type="button" className="secondary" onClick={() => refetch()}>Reintentar</button>
        </div>
      )}

      <div className="list-stack mt-16">
        {equipos?.map((equipo) => (
          <div key={equipo.id} className="entity-card">
            <div style={{ width: '100%' }}>
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
                  <button type="button" className="secondary" onClick={() => setEquipoRenombrando(null)}>
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
                    <button
                      type="button"
                      className="link-btn link-btn--delete"
                      onClick={() => handleEliminarEquipo(equipo.id, equipo.nombre)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )}

              <div className="list-stack mt-16">
                {equipo.miembros.map((m) => (
                  <div key={m.usuarioId} className="row-between text-muted-sm">
                    <span>{m.usuario.nombre} ({m.usuario.email})</span>
                    <button
                      type="button"
                      className="link-btn link-btn--delete"
                      onClick={() => handleQuitarMiembro(equipo.id, m.usuarioId, m.usuario.nombre)}
                    >
                      Quitar
                    </button>
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

function EquiposDeSalaEstudiante({ salaId, sala }: { salaId: string; sala: Sala }) {
  const confirm = useConfirm();
  const currentUser = useAuthStore((s) => s.user);
  const { data: equipos, isLoading, isError, error, refetch } = useEquipos(salaId);
  const { mutate: crearEquipo, isPending: creando } = useCreateEquipo(salaId);
  const { mutate: quitarMiembro } = useRemoveMiembroEquipo(salaId);

  const [nombreEquipo, setNombreEquipo] = useState('');

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

      {isLoading && <p>Cargando equipos…</p>}
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
              <div style={{ width: '100%' }}>
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
