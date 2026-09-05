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
        <form onSubmit={handleAgregar} style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
          <input
            type="email"
            placeholder="Email del usuario a agregar"
            aria-label="Email del usuario a agregar"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
            style={{ flex: 1, padding: 8 }}
          />
          <button type="submit" className="primary" disabled={isAdding}>
            {isAdding ? 'Agregando…' : '+ Agregar miembro'}
          </button>
        </form>
      )}

      {!esCreadorOAdmin && (
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '12px 0' }}>
          Solo el creador del proyecto o un administrador pueden agregar o quitar miembros.
        </p>
      )}

      {isLoading && <p>Cargando…</p>}
      {isError && <p style={{ color: 'var(--coral)' }}>{(error as Error).message}</p>}

      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        {miembros?.map((m) => (
          <div
            key={m.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 12,
              border: '1px solid var(--line)',
              borderRadius: 8,
            }}
          >
            <div>
              <b>{m.usuario.nombre}</b>
              {m.usuario.id === proyecto?.creadoPorId && (
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--muted)' }}>(creador)</span>
              )}
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.usuario.email}</div>
            </div>
            {esCreadorOAdmin && m.usuario.id !== proyecto?.creadoPorId && (
              <button
                type="button"
                onClick={() => handleQuitar(m.usuario.id, m.usuario.nombre)}
                style={{ cursor: 'pointer', color: 'var(--coral)', background: 'none', border: 0 }}
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
