import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import {
  useComments,
  useCreateComment,
  useRemoveComment,
  useUpdateComment,
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
  const currentUser = useAuthStore((state) => state.user);
  const activeRole = useActivePerspective();
  const [texto, setTexto] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [textoEdicion, setTextoEdicion] = useState('');

  function handleCrear(event: React.FormEvent) {
    event.preventDefault();
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
    editar({ comentarioId, texto: limpio }, { onSuccess: cancelarEdicion });
  }

  async function handleBorrar(comentarioId: string) {
    if (await confirm('¿Borrar este comentario?')) borrar(comentarioId);
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
    <div className="comments-page">
      <section className="comments-intro">
        <span className="eyebrow">Conversación del proyecto</span>
        <h2>Comentarios</h2>
        <p>Deja decisiones, preguntas o contexto para que el equipo pueda retomarlos después.</p>
      </section>

      <form onSubmit={handleCrear} className="comment-composer">
        <span className="comment-avatar" aria-hidden="true">{(currentUser?.nombre ?? 'U').charAt(0).toUpperCase()}</span>
        <label className="sr-only" htmlFor="nuevo-comentario">Nuevo comentario</label>
        <textarea id="nuevo-comentario" placeholder="Escribe una observación o decisión…" value={texto} onChange={(event) => setTexto(event.target.value)} required rows={3} />
        <div className="comment-composer-actions">
          <small>{texto.trim().length} caracteres</small>
          <button type="submit" className="primary" disabled={creando || !texto.trim()}>{creando ? 'Publicando…' : 'Publicar comentario'}</button>
        </div>
      </form>

      {isLoading && <div className="loading-block" aria-label="Cargando comentarios" />}
      {isError && (
        <div className="inline-state inline-state--error" role="alert">
          <p>{(error as Error).message}</p>
          <button type="button" className="secondary" onClick={() => refetch()}>Reintentar</button>
        </div>
      )}

      <section className="comment-feed" aria-label="Comentarios del proyecto">
        {comentarios?.map((comentario) => (
          <article key={comentario.id} className="comment-item">
            <span className="comment-avatar" aria-hidden="true">{comentario.autor.nombre.charAt(0).toUpperCase()}</span>
            {editandoId === comentario.id ? (
              <div className="comment-edit">
                <label className="sr-only" htmlFor={`editar-comentario-${comentario.id}`}>Editar comentario</label>
                <textarea id={`editar-comentario-${comentario.id}`} value={textoEdicion} onChange={(event) => setTextoEdicion(event.target.value)} rows={3} />
                <div className="comment-edit-actions">
                  <button type="button" className="secondary" onClick={cancelarEdicion}>Cancelar</button>
                  <button type="button" className="primary" disabled={!textoEdicion.trim()} onClick={() => guardarEdicion(comentario.id)}>Guardar cambios</button>
                </div>
              </div>
            ) : (
              <div className="comment-body">
                <header>
                  <div><strong>{comentario.autor.nombre}</strong><time dateTime={comentario.createdAt}>{formatearFecha(comentario.createdAt)}</time></div>
                  {puedeGestionar(comentario.autorId) && (
                    <div className="comment-actions">
                      <button type="button" className="text-button" onClick={() => iniciarEdicion(comentario.id, comentario.texto)}>Editar</button>
                      <button type="button" className="text-button text-button--danger" onClick={() => handleBorrar(comentario.id)}>Borrar</button>
                    </div>
                  )}
                </header>
                <p>{comentario.texto}</p>
              </div>
            )}
          </article>
        ))}
        {comentarios && comentarios.length === 0 && (
          <div className="empty-state empty-state--compact"><strong>La conversación está vacía</strong><p>Publica el primer comentario para dejar contexto al equipo.</p></div>
        )}
      </section>
    </div>
  );
}
