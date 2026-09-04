// apps/frontend/src/pages/ProjectsPage.tsx

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCreateProject, useProjects, useUpdateProject } from '../features/projects/hooks/useProjectsQueries';
import type { Proyecto } from '../features/projects/api/projects.api';

export function ProjectsPage() {
  const { data: proyectos, isLoading } = useProjects();
  const { mutate: crear, isPending } = useCreateProject();
  const { mutate: actualizar, isPending: isUpdating } = useUpdateProject();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [edicion, setEdicion] = useState({ nombre: '', descripcion: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    crear(
      { nombre: nombre.trim(), descripcion: descripcion.trim() || undefined },
      { onSuccess: () => { setNombre(''); setDescripcion(''); } },
    );
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
        <span className="count">{proyectos?.length ?? 0} en total</span>
      </div>

      <form onSubmit={handleSubmit} className="create-project panel">
        <div><span className="eyebrow">NUEVO PROYECTO</span><h2>Comienza una investigación</h2></div>
        <div className="form-row">
        <input
          placeholder="Nombre del proyecto"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className="text-input"
        />
        <input
          placeholder="Descripción (opcional)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="text-input"
        />
        <button type="submit" className="primary" disabled={isPending}>
          {isPending ? 'Creando…' : '+ Nuevo proyecto'}
        </button>
        </div>
      </form>

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
