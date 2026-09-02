// apps/frontend/src/pages/ProjectsPage.tsx

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCreateProject, useProjects } from '../features/projects/hooks/useProjectsQueries';

export function ProjectsPage() {
  const { data: proyectos, isLoading } = useProjects();
  const { mutate: crear, isPending } = useCreateProject();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    crear(
      { nombre: nombre.trim(), descripcion: descripcion.trim() || undefined },
      { onSuccess: () => { setNombre(''); setDescripcion(''); } },
    );
  }

  return (
    <div>
      <h1>Proyectos</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, margin: '16px 0', flexWrap: 'wrap' }}>
        <input
          placeholder="Nombre del proyecto"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          style={{ padding: 8, flex: '1 1 220px' }}
        />
        <input
          placeholder="Descripción (opcional)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          style={{ padding: 8, flex: '2 1 320px' }}
        />
        <button type="submit" disabled={isPending} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          {isPending ? 'Creando…' : '+ Nuevo proyecto'}
        </button>
      </form>

      {isLoading && <p>Cargando…</p>}

      <div style={{ display: 'grid', gap: 8 }}>
        {proyectos?.map((p) => (
          <Link
            key={p.id}
            to={`/proyectos/${p.id}`}
            style={{
              display: 'block',
              padding: 14,
              border: '1px solid #ddd',
              borderRadius: 10,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <b>{p.nombre}</b>
            {p.descripcion && <p style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}>{p.descripcion}</p>}
          </Link>
        ))}
        {proyectos && proyectos.length === 0 && <p>No hay proyectos todavía — creá el primero arriba.</p>}
      </div>
    </div>
  );
}
