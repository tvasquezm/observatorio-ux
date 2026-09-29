import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useAdminProjectOverview,
  useCreateProject,
  useDeleteProject,
  useUpdateProject,
} from '../../projects/hooks/useProjectsQueries';
import type { AdminProjectOverview } from '../../projects/api/projects.api';
import { useConfirm } from '../../../shared/api/confirm';

function ProjectProgress({ project }: { project: AdminProjectOverview }) {
  const total = project.sesiones.length;
  const completed = project.sesiones.filter((session) => session.estado === 'COMPLETADO').length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="admin-progress">
      <span>{total === 0 ? 'Sin sesiones' : `${completed} de ${total} completadas`}</span>
      <progress value={completed} max={Math.max(total, 1)} aria-label={`Avance de ${project.nombre}`}>
        {percentage}%
      </progress>
      <small>{total === 0 ? '0 %' : `${percentage} %`}</small>
    </div>
  );
}

export function AdminProjectsPanel() {
  const { data: projects, isLoading, isError, error, refetch } = useAdminProjectOverview();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const confirm = useConfirm();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState({ nombre: '', descripcion: '' });

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    createProject.mutate(
      { nombre: name.trim(), descripcion: description.trim() || undefined },
      {
        onSuccess: () => {
          setName('');
          setDescription('');
          setCreating(false);
        },
      },
    );
  }

  function startEditing(project: AdminProjectOverview) {
    setEditingId(project.id);
    setEditing({ nombre: project.nombre, descripcion: project.descripcion ?? '' });
  }

  function handleUpdate(event: React.FormEvent) {
    event.preventDefault();
    if (!editingId || !editing.nombre.trim()) return;
    updateProject.mutate(
      {
        id: editingId,
        data: { nombre: editing.nombre.trim(), descripcion: editing.descripcion.trim() },
      },
      { onSuccess: () => setEditingId(null) },
    );
  }

  async function handleDelete(project: AdminProjectOverview) {
    const accepted = await confirm(
      `¿Eliminar el proyecto "${project.nombre}"? Sus datos dejarán de estar disponibles.`,
    );
    if (accepted) deleteProject.mutate(project.id);
  }

  return (
    <section className="panel admin-section" aria-labelledby="admin-projects-title">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Portafolio</span>
          <h2 id="admin-projects-title">Proyectos y avance</h2>
          <p className="section-description">
            Gestiona proyectos y revisa el estado de sus sesiones de investigación.
          </p>
        </div>
        <div className="page-head-actions">
          <span className="count">{projects?.length ?? 0}</span>
          <button type="button" className="primary" onClick={() => setCreating((value) => !value)}>
            Nuevo proyecto
          </button>
        </div>
      </div>

      {creating && (
        <form className="admin-project-form" onSubmit={handleCreate}>
          <label className="field" htmlFor="admin-project-name">
            Nombre
            <input id="admin-project-name" value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
          </label>
          <label className="field" htmlFor="admin-project-description">
            Descripción
            <input id="admin-project-description" value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <div className="form-actions">
            <button type="button" className="secondary" onClick={() => setCreating(false)}>Cancelar</button>
            <button type="submit" className="primary" disabled={createProject.isPending}>
              {createProject.isPending ? 'Creando…' : 'Crear proyecto'}
            </button>
          </div>
        </form>
      )}

      {isLoading && <div className="loading-block" aria-label="Cargando proyectos" />}
      {isError && (
        <div className="inline-state inline-state--error" role="alert">
          <p>{error instanceof Error ? error.message : 'No se pudieron cargar los proyectos.'}</p>
          <button type="button" className="secondary" onClick={() => refetch()}>Reintentar</button>
        </div>
      )}
      {projects && projects.length === 0 && (
        <div className="empty-state empty-state--compact">
          <strong>Aún no hay proyectos</strong><p>Crea el primero desde este panel.</p>
        </div>
      )}
      {projects && projects.length > 0 && (
        <div className="table-shell">
          <table className="data-table admin-table admin-projects-table">
            <caption className="sr-only">Proyectos y avance de sus sesiones</caption>
            <thead><tr><th>Proyecto</th><th>Responsable</th><th>Sesiones</th><th>Artefactos</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    {editingId === project.id ? (
                      <form className="admin-project-inline-edit" onSubmit={handleUpdate}>
                        <label className="sr-only" htmlFor={`project-name-${project.id}`}>Nombre del proyecto</label>
                        <input id={`project-name-${project.id}`} value={editing.nombre} onChange={(event) => setEditing({ ...editing, nombre: event.target.value })} required />
                        <label className="sr-only" htmlFor={`project-description-${project.id}`}>Descripción del proyecto</label>
                        <input id={`project-description-${project.id}`} value={editing.descripcion} onChange={(event) => setEditing({ ...editing, descripcion: event.target.value })} placeholder="Descripción" />
                        <div className="form-actions">
                          <button className="primary" disabled={updateProject.isPending}>Guardar</button>
                          <button type="button" className="secondary" onClick={() => setEditingId(null)}>Cancelar</button>
                        </div>
                      </form>
                    ) : (
                      <span className="admin-project-name"><strong>{project.nombre}</strong><small>{project.descripcion || 'Sin descripción'}</small></span>
                    )}
                  </td>
                  <td><span className="admin-project-owner"><strong>{project.creadoPor.nombre}</strong><small>{project.creadoPor.email}</small></span></td>
                  <td><ProjectProgress project={project} /></td>
                  <td>{project._count.artefactos}</td>
                  <td className="table-actions">
                    <button type="button" className="text-button" onClick={() => startEditing(project)}>Editar</button>
                    <Link className="text-button" to={`/proyectos/${project.id}`}>Abrir</Link>
                    <button
                      type="button"
                      className="text-button text-button--danger"
                      disabled={deleteProject.isPending}
                      onClick={() => handleDelete(project)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
