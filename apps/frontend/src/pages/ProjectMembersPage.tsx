// apps/frontend/src/pages/ProjectMembersPage.tsx
//
// Gestión de miembros de un proyecto (ProyectoMiembro). Solo el creador
// del proyecto o un ADMIN puede agregar/quitar — el backend lo exige
// (assertOwnerOrAdmin en ProjectAccessService) y acá se refleja en la UI
// para no mostrar controles que van a terminar en 403.

import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import { useProject } from '../features/projects/hooks/useProjectsQueries';
import { useMembers, useAddMember, useRemoveMember } from '../features/projects/hooks/useProjectsQueries';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { useConfirm } from '../shared/api/confirm';

export function ProjectMembersPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const { data: proyecto } = useProject(proyectoId);
  const { data: miembros, isLoading, isError, error } = useMembers(proyectoId);
  const { mutate: agregar, isPending: isAdding } = useAddMember(proyectoId);
  const { mutate: quitar } = useRemoveMember(proyectoId);
  const confirm = useConfirm();
  const currentUser = useAuthStore((s) => s.user);

  const [email, setEmail] = useState('');

  const esCreadorOAdmin =
    !!currentUser && (currentUser.rol === 'ADMIN' || currentUser.id === proyecto?.creadoPorId);

  function handleAgregar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const limpio = email.trim();
    if (!limpio) return;
    agregar(limpio, { onSuccess: () => setEmail('') });
  }

  async function handleQuitar(usuarioId: string, nombre: string) {
    if (await confirm(`¿Quitar a ${nombre} de este proyecto?`)) {
      quitar(usuarioId);
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Miembros del proyecto</h2>
      </div>

      {esCreadorOAdmin && (
        <form onSubmit={handleAgregar} className="form-row-inline">
          <input
            type="email"
            placeholder="Email del usuario a agregar"
            aria-label="Email del usuario a agregar"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
            className="input-flex"
          />
          <button type="submit" className="primary" disabled={isAdding}>
            {isAdding ? 'Agregando…' : '+ Agregar miembro'}
          </button>
        </form>
      )}

      {!esCreadorOAdmin && (
        <p className="hint-block">
          Solo el creador del proyecto o un administrador pueden agregar o quitar miembros.
        </p>
      )}

      {isLoading && <p>Cargando…</p>}
      {isError && <p className="error-text">{(error as Error).message}</p>}

      <div className="list-stack">
        {miembros?.map((m) => (
          <div key={m.id} className="entity-card row-between">
            <div>
              <b>{m.usuario.nombre}</b>
              {m.usuario.id === proyecto?.creadoPorId && (
                <span className="badge-muted">(creador)</span>
              )}
              <div className="text-muted-sm">{m.usuario.email}</div>
            </div>
            {esCreadorOAdmin && m.usuario.id !== proyecto?.creadoPorId && (
              <button
                type="button"
                onClick={() => handleQuitar(m.usuario.id, m.usuario.nombre)}
                className="link-btn link-btn--delete"
              >
                Quitar
              </button>
            )}
          </div>
        ))}
        {miembros && miembros.length === 0 && <p>No hay miembros todavía.</p>}
      </div>
    </div>
  );
}
