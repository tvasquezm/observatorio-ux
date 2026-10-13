// apps/frontend/src/pages/ProjectsPage.tsx

import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCreateProject, useProjects, useUpdateProject } from '../features/projects/hooks/useProjectsQueries';
import type { Proyecto } from '../features/projects/api/projects.api';
import { useSalas } from '../features/salas/hooks/useSalasQueries';
import { useActivePerspective } from '../shared/auth/useActivePerspective';
import { useUnsavedChanges } from '../shared/hooks/useUnsavedChanges';

export function ProjectsPage() {
  const { data: proyectos, isLoading, isError, refetch } = useProjects();
  const { mutate: crear, isPending, error: createError } = useCreateProject();
  const { mutate: actualizar, isPending: isUpdating, error: updateError } = useUpdateProject();
  const activeRole = useActivePerspective();
  const esEstudiante = activeRole === 'ESTUDIANTE';
  const { data: salas, isLoading: loadingSalas, isError: salasError } = useSalas();
  // Fase 5: un ESTUDIANTE solo puede crear un proyecto dentro de una sala
  // que lo permita (Sala.permiteCreacionProyectos) — el backend lo exige.
  const salasElegibles = (salas ?? []).filter((s) => s.permiteCreacionProyectos);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [salaId, setSalaId] = useState('');
  const [mostrandoCreacion, setMostrandoCreacion] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const busqueda = searchParams.get('q') ?? '';
  const [editando, setEditando] = useState<string | null>(null);
  const [edicion, setEdicion] = useState({ nombre: '', descripcion: '' });
  const createTrigger = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const [validationError, setValidationError] = useState('');
  const { confirmDiscard } = useUnsavedChanges(mostrandoCreacion || editando !== null, { nombre, descripcion, salaId, edicion }, isPending || isUpdating, editando ?? 'new');
  const canCreate = !esEstudiante || (!loadingSalas && !salasError && salasElegibles.length > 0);

  function validateName(value: string, inputId: string) {
    if (value.trim()) { setValidationError(''); return true; }
    setValidationError('Escribe un nombre para el proyecto.');
    document.getElementById(inputId)?.focus();
    return false;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateName(nombre, 'nuevo-proyecto-nombre')) return;
    if (esEstudiante && !salaId) return;
    crear(
      {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        ...(esEstudiante ? { salaId } : {}),
      },
      {
        onSuccess: () => {
          resetEditor();
        },
      },
    );
  }

  function resetEditor() {
    setNombre('');
    setDescripcion('');
    setSalaId('');
    setMostrandoCreacion(false);
    setEditando(null);
    setEdicion({ nombre: '', descripcion: '' });
    setValidationError('');
    restoreFocus.current?.focus();
  }
  async function cancelarCreacion() {
    if (await confirmDiscard()) resetEditor();
  }
  async function abrirCreacion() {
    if (mostrandoCreacion) { await cancelarCreacion(); return; }
    if (!(await confirmDiscard())) return;
    resetEditor();
    restoreFocus.current = createTrigger.current;
    setMostrandoCreacion(true);
  }
  async function iniciarEdicion(project: Proyecto, trigger: HTMLButtonElement) {
    if (!(await confirmDiscard())) return;
    resetEditor();
    restoreFocus.current = trigger;
    setEditando(project.id);
    setEdicion({ nombre: project.nombre, descripcion: project.descripcion ?? '' });
  }

  function guardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!editando || !validateName(edicion.nombre, `editar-proyecto-nombre-${editando}`)) return;
    actualizar({ id: editando, data: { nombre: edicion.nombre.trim(), descripcion: edicion.descripcion.trim() } }, { onSuccess: resetEditor });
  }

  const filtrados = useMemo(() => (proyectos ?? []).filter((p) => `${p.nombre} ${p.descripcion ?? ''}`.toLowerCase().includes(busqueda.toLowerCase())), [proyectos, busqueda]);

  return (
    <div>
      <div className="page-head">
        <div><span className="eyebrow">ESPACIOS DE TRABAJO</span><h1>Proyectos</h1><p>Organiza tus investigaciones y accede a todas sus técnicas.</p></div>
        <div className="page-head-actions">
          <span className="count">{isLoading || isError ? '—' : `${proyectos?.length ?? 0} en total`}</span>
          <button
            ref={createTrigger}
            type="button"
            className="primary"
            aria-expanded={mostrandoCreacion}
            aria-controls="crear-proyecto"
            disabled={isPending || isUpdating || !canCreate}
            aria-describedby={!canCreate ? 'project-create-help' : undefined}
            onClick={() => void abrirCreacion()}
          >
            Nuevo proyecto
          </button>
        </div>
      </div>

      {!canCreate && <p id="project-create-help" className="hint-block" role="status">{loadingSalas ? 'Consultando tus salas…' : salasError ? 'No pudimos comprobar tus salas. Vuelve a intentarlo más tarde.' : 'Ninguna de tus salas permite crear proyectos. Solicita a tu docente que habilite esta opción.'}</p>}
      {mostrandoCreacion && (
        <form id="crear-proyecto" onSubmit={handleSubmit} className="create-project panel">
          <div><span className="eyebrow">DATOS BÁSICOS</span><h2>Crear proyecto</h2></div>
          <div className="project-form-fields">
            <div className="field"><label htmlFor="nuevo-proyecto-nombre">Nombre del proyecto</label>
            <input
              id="nuevo-proyecto-nombre"
              placeholder="Ej.: Investigación sobre matrícula"
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); setValidationError(''); }}
              required
              autoFocus
              className="text-input"
              aria-invalid={Boolean(validationError)}
              aria-describedby={validationError ? 'project-name-error' : undefined}
            />
            {validationError && <p id="project-name-error" role="alert" className="error-text">{validationError}</p>}</div>
            <div className="field"><label htmlFor="nuevo-proyecto-descripcion">Descripción del proyecto (opcional)</label>
            <input
              id="nuevo-proyecto-descripcion"
              placeholder="Objetivo de la investigación"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="text-input"
            /></div>
            {esEstudiante && salasElegibles.length > 0 && (
              <div className="field">
                <label htmlFor="nuevo-proyecto-sala">Sala</label>
                <select
                  id="nuevo-proyecto-sala"
                  value={salaId}
                  onChange={(e) => setSalaId(e.target.value)}
                  required
                  className="text-input"
                >
                  <option value="">Selecciona una sala…</option>
                  {salasElegibles.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>
            )}
            {esEstudiante && salasElegibles.length === 0 && (
              <p className="hint-block">
                Ninguna de tus salas permite todavía que los estudiantes creen proyectos.
              </p>
            )}
            <div className="form-actions project-create-actions">
              <button type="button" className="secondary" disabled={isPending} onClick={() => void cancelarCreacion()}>Cancelar</button>
              <button
                type="submit"
                className="primary"
                disabled={isPending || (esEstudiante && salasElegibles.length === 0)}
              >
                {isPending ? 'Creando…' : 'Crear'}
              </button>
            </div>
          </div>
          {createError && <p role="alert" className="error-text">{createError.message} Revisa los datos y vuelve a intentarlo; tu borrador se conserva.</p>}
        </form>
      )}

      <div className="toolbar"><div><h2>Todos tus proyectos</h2><span className="muted">Selecciona uno para ver sus técnicas.</span></div><div><label className="sr-only" htmlFor="buscar-proyecto">Buscar proyecto</label><input id="buscar-proyecto" className="search-input" value={busqueda} onChange={(e) => { const next = new URLSearchParams(searchParams); if (e.target.value) next.set('q', e.target.value); else next.delete('q'); setSearchParams(next, { replace: true }); }} placeholder="Buscar proyecto…" /></div></div>

      {isLoading && <div className="panel" role="status"><p>Cargando proyectos…</p></div>}
      {isError && <div className="inline-state inline-state--error" role="alert"><p>No pudimos cargar tus proyectos. Comprueba tu conexión y vuelve a intentarlo.</p><button type="button" className="secondary" onClick={() => void refetch()}>Reintentar</button></div>}

      <div className="project-grid">
        {filtrados.map((p, index) => (
          <article key={p.id} className="project-card">
            <Link to={`/proyectos/${p.id.replace(/^\//, '')}`} className="project-card-main">
              <span className={`project-dot ${['blue', 'green', 'orange'][index % 3]}`}>{p.nombre[0]?.toUpperCase()}</span>
              <div><span className="project-kicker">{(p._count?.sesiones ?? 0) > 0 ? 'CON SESIONES REGISTRADAS' : 'LISTO PARA INICIAR'}</span><h3>{p.nombre}</h3>{p.descripcion && <p>{p.descripcion}</p>}</div>
              <span className="arrow">→</span>
            </Link>
            <div className="project-card-foot"><span>{p._count?.sesiones ?? 0} sesiones · {p._count?.artefactos ?? 0} artefactos</span><button type="button" className="text-button" disabled={isPending || isUpdating} onClick={(event) => void iniciarEdicion(p, event.currentTarget)}>Editar</button></div>
            {editando === p.id && <form onSubmit={guardarEdicion} className="inline-edit project-form-fields">
              <div className="field"><label htmlFor={`editar-proyecto-nombre-${p.id}`}>Nombre del proyecto</label><input id={`editar-proyecto-nombre-${p.id}`} className="text-input" value={edicion.nombre} onChange={(e) => { setEdicion({ ...edicion, nombre: e.target.value }); setValidationError(''); }} required autoFocus aria-invalid={Boolean(validationError)} aria-describedby={validationError ? 'project-edit-error' : undefined} />{validationError && <p id="project-edit-error" role="alert" className="error-text">{validationError}</p>}</div>
              <div className="field"><label htmlFor={`editar-proyecto-descripcion-${p.id}`}>Descripción del proyecto (opcional)</label><input id={`editar-proyecto-descripcion-${p.id}`} className="text-input" value={edicion.descripcion} onChange={(e) => setEdicion({ ...edicion, descripcion: e.target.value })} /></div>
              {updateError && <p role="alert" className="error-text">{updateError.message} Tu borrador se conserva; vuelve a intentarlo.</p>}
              <div className="form-actions"><button className="primary" disabled={isUpdating}>Guardar</button><button className="secondary" type="button" disabled={isUpdating} onClick={() => void cancelarCreacion()}>Cancelar</button></div></form>}
          </article>
        ))}
        {!isLoading && !isError && proyectos && filtrados.length === 0 && <div className="panel empty-state"><span aria-hidden="true">⌕</span><p>{busqueda ? 'No hay proyectos que coincidan con la búsqueda.' : 'No hay proyectos todavía.'}</p>{busqueda ? <button type="button" className="secondary" onClick={() => { const next = new URLSearchParams(searchParams); next.delete('q'); setSearchParams(next, { replace: true }); }}>Limpiar búsqueda</button> : canCreate && <button type="button" className="secondary" onClick={() => void abrirCreacion()}>Crear tu primer proyecto</button>}</div>}
      </div>
    </div>
  );
}
