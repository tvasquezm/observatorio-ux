// apps/frontend/src/pages/ProjectsPage.tsx

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCreateProject, useProjects, useUpdateProject } from '../features/projects/hooks/useProjectsQueries';
import type { Proyecto } from '../features/projects/api/projects.api';
import { useSalas } from '../features/salas/hooks/useSalasQueries';
import { useActivePerspective } from '../shared/auth/useActivePerspective';

export function ProjectsPage() {
  const { data: proyectos, isLoading } = useProjects();
  const { mutate: crear, isPending } = useCreateProject();
  const { mutate: actualizar, isPending: isUpdating } = useUpdateProject();
  const activeRole = useActivePerspective();
  const esEstudiante = activeRole === 'ESTUDIANTE';
  const { data: salas } = useSalas();
  // Fase 5: un ESTUDIANTE solo puede crear un proyecto dentro de una sala
  // que lo permita (Sala.permiteCreacionProyectos) — el backend lo exige.
  const salasElegibles = (salas ?? []).filter((s) => s.permiteCreacionProyectos);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [salaId, setSalaId] = useState('');
  const [mostrandoCreacion, setMostrandoCreacion] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [edicion, setEdicion] = useState({ nombre: '', descripcion: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    if (esEstudiante && !salaId) return;
    crear(
      {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        ...(esEstudiante ? { salaId } : {}),
      },
      {
        onSuccess: () => {
          setNombre('');
          setDescripcion('');
          setSalaId('');
          setMostrandoCreacion(false);
        },
      },
    );
  }

  function cancelarCreacion() {
    setNombre('');
    setDescripcion('');
    setSalaId('');
    setMostrandoCreacion(false);
  }

  function iniciarEdicion(project: Proyecto) {
    setEditando(project.id);
    setEdicion({ nombre: project.nombre, descripcion: project.descripcion ?? '' });
  }

  function guardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!editando || !edicion.nombre.trim()) return;
    actualizar({ id: editando, data: { nombre: edicion.nombre.trim(), descripcion: edicion.descripcion.trim() } }, { onSuccess: () => setEditando(null) });
  }

  const filtrados = useMemo(() => (proyectos ?? []).filter((p) => `${p.nombre} ${p.descripcion ?? ''}`.toLowerCase().includes(busqueda.toLowerCase())), [proyectos, busqueda]);

  return (
    <div>
      <div className="page-head">
        <div><span className="eyebrow">ESPACIOS DE TRABAJO</span><h1>Proyectos</h1><p>Organiza tus investigaciones y accede a todas sus técnicas.</p></div>
        <div className="page-head-actions">
          <span className="count">{proyectos?.length ?? 0} en total</span>
          <button
            type="button"
            className="primary"
            aria-expanded={mostrandoCreacion}
            aria-controls="crear-proyecto"
            onClick={() => setMostrandoCreacion((visible) => !visible)}
          >
            Nuevo proyecto
          </button>
        </div>
      </div>

      {mostrandoCreacion && (
        <form id="crear-proyecto" onSubmit={handleSubmit} className="create-project panel">
          <div><span className="eyebrow">DATOS BÁSICOS</span><h2>Crear proyecto</h2></div>
          <div className="form-row">
            <label className="sr-only" htmlFor="nuevo-proyecto-nombre">Nombre del proyecto</label>
            <input
              id="nuevo-proyecto-nombre"
              placeholder="Nombre del proyecto"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              autoFocus
              className="text-input"
            />
            <label className="sr-only" htmlFor="nuevo-proyecto-descripcion">Descripción del proyecto</label>
            <input
              id="nuevo-proyecto-descripcion"
              placeholder="Descripción (opcional)"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="text-input"
            />
            {esEstudiante && salasElegibles.length > 0 && (
              <>
                <label className="sr-only" htmlFor="nuevo-proyecto-sala">Sala</label>
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
              </>
            )}
            {esEstudiante && salasElegibles.length === 0 && (
              <p className="hint-block">
                Ninguna de tus salas permite todavía que los estudiantes creen proyectos.
              </p>
            )}
            <div className="form-actions project-create-actions">
              <button type="button" className="secondary" onClick={cancelarCreacion}>Cancelar</button>
              <button
                type="submit"
                className="primary"
                disabled={isPending || (esEstudiante && salasElegibles.length === 0)}
              >
                {isPending ? 'Creando…' : 'Crear'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="toolbar"><div><h2>Todos tus proyectos</h2><span className="muted">Selecciona uno para ver sus técnicas.</span></div><input className="search-input" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar proyecto…" /></div>

      {isLoading && <div className="panel"><p>Cargando…</p></div>}

      <div className="project-grid">
        {filtrados.map((p, index) => (
          <article key={p.id} className="project-card">
            <Link to={`/proyectos/${p.id.replace(/^\//, '')}`} className="project-card-main">
              <span className={`project-dot ${['blue', 'green', 'orange'][index % 3]}`}>{p.nombre[0]?.toUpperCase()}</span>
              <div><span className="project-kicker">{index % 2 ? 'EN INVESTIGACIÓN' : 'PROYECTO ACTIVO'}</span><h3>{p.nombre}</h3>{p.descripcion && <p>{p.descripcion}</p>}</div>
              <span className="arrow">→</span>
            </Link>
            <div className="project-card-foot"><span>5 técnicas disponibles</span><button type="button" className="text-button" onClick={() => iniciarEdicion(p)}>Editar</button></div>
            {editando === p.id && <form onSubmit={guardarEdicion} className="inline-edit"><input className="text-input" value={edicion.nombre} onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })} required /><input className="text-input" value={edicion.descripcion} onChange={(e) => setEdicion({ ...edicion, descripcion: e.target.value })} placeholder="Descripción" /><div className="form-actions"><button className="primary" disabled={isUpdating}>Guardar</button><button className="secondary" type="button" onClick={() => setEditando(null)}>Cancelar</button></div></form>}
          </article>
        ))}
        {proyectos && filtrados.length === 0 && <div className="panel empty-state"><span>⌕</span><p>{busqueda ? 'No hay proyectos que coincidan con la búsqueda.' : 'No hay proyectos todavía.'}</p></div>}
      </div>
    </div>
  );
}
