// apps/frontend/src/pages/ProjectCommentsPage.tsx
//
// Comentarios generales del proyecto (sin filtro por artefactoLogicoId en
// esta fase). Cualquiera con acceso al proyecto puede publicar; editar/
// borrar es solo del propio autor o ADMIN (mismo criterio que el backend
// en CommentsService.findOwn).

import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useRemoveComment,
} from '../features/comments/hooks/useCommentsQueries';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { useActivePerspective } from '../shared/auth/useActivePerspective';
import { useConfirm } from '../shared/api/confirm';

export function ProjectCommentsPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const { data: comentarios, isLoading, isError, error, refetch } = useComments(proyectoId);
  const { mutate: crear, isPending: creando } = useCreateComment(proyectoId);
  const { mutate: editar } = useUpdateComment(proyectoId);
  const { mutate: borrar } = useRemoveComment(proyectoId);
  const confirm = useConfirm();
  const currentUser = useAuthStore((s) => s.user);
  const activeRole = useActivePerspective();

  const [texto, setTexto] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [textoEdicion, setTextoEdicion] = useState('');

  function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio) return;
    crear(limpio, { onSuccess: () => setTexto('') });
  }

  function puedeGestionar(autorId: string) {
    return activeRole === 'ADMIN' || currentUser?.id === autorId;
  }

  function iniciarEdicion(comentarioId: string, textoActual: string) {
    setEditandoId(comentarioId);
    setTextoEdicion(textoActual);
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setTextoEdicion('');
  }

  function guardarEdicion(comentarioId: string) {
    const limpio = textoEdicion.trim();
    if (!limpio) return;
    editar(
      { comentarioId, texto: limpio },
      { onSuccess: cancelarEdicion },
    );
  }

  async function handleBorrar(comentarioId: string) {
    if (await confirm('¿Borrar este comentario?')) {
      borrar(comentarioId);
    }
  }

  function formatearFecha(fechaRaw: string) {
    const fecha = new Date(fechaRaw);
    if (Number.isNaN(fecha.getTime())) return '';
    return fecha.toLocaleString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Comentarios</h2>
      </div>

      <form onSubmit={handleCrear} className="form-row-inline">
        <input
          type="text"
          placeholder="Escribe un comentario…"
          aria-label="Nuevo comentario"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          required
          className="input-flex"
        />
        <button type="submit" className="primary" disabled={creando}>
          {creando ? 'Publicando…' : '+ Comentar'}
        </button>
      </form>

      {isLoading && <p>Cargando…</p>}
      {isError && (
        <div className="error-text" role="alert">
          <p>{(error as Error).message}</p>
          <button type="button" className="secondary" onClick={() => refetch()}>Reintentar</button>
        </div>
      )}

      <div className="list-stack mt-16">
        {comentarios?.map((c) => (
          <div key={c.id} className="entity-card">
            {editandoId === c.id ? (
              <div className="form-row-inline" style={{ width: '100%' }}>
                <input
                  type="text"
                  aria-label="Editar comentario"
                  value={textoEdicion}
                  onChange={(e) => setTextoEdicion(e.target.value)}
                  className="input-flex"
                />
                <button type="button" className="primary" onClick={() => guardarEdicion(c.id)}>
                  Guardar
                </button>
                <button type="button" className="secondary" onClick={cancelarEdicion}>
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <div>
                  <p>{c.texto}</p>
                  <div className="text-muted-sm">
                    {c.autor.nombre} · {formatearFecha(c.createdAt)}
                  </div>
                </div>
                {puedeGestionar(c.autorId) && (
                  <div className="form-row-inline">
                    <button
                      type="button"
                      className="link-btn link-btn--edit"
                      onClick={() => iniciarEdicion(c.id, c.texto)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="link-btn link-btn--delete"
                      onClick={() => handleBorrar(c.id)}
                    >
                      Borrar
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        {comentarios && comentarios.length === 0 && <p>Todavía no hay comentarios.</p>}
      </div>
    </div>
  );
}
