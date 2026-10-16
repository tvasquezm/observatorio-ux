import React, { useId, useState } from 'react';
import { TECNICAS_COMENTARIO } from '@observatorio-ux/shared-types';
import {
  useComments,
  useCreateComment,
  useRemoveComment,
  useUpdateComment,
} from '../hooks/useCommentsQueries';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useActivePerspective } from '../../../shared/auth/useActivePerspective';
import { useConfirm } from '../../../shared/api/confirm';
import { useDiscardChanges } from '../../../shared/hooks/useDiscardChanges';

interface ComentariosPanelProps {
  proyectoId: string;
  // Clave de tecnica o `general`; sin valor lista todos los comentarios.
  filtro?: string;
  // Tecnica con la que se publica; sin valor el comentario es general.
  publicarEn?: string;
  // Muestra la tecnica de origen de cada comentario.
  mostrarOrigen?: boolean;
}

function etiquetaOrigen(tecnica: string | null) {
  if (!tecnica) return 'General';
  return TECNICAS_COMENTARIO.find((t) => t.clave === tecnica)?.etiqueta ?? tecnica;
}

export function ComentariosPanel({ proyectoId, filtro, publicarEn, mostrarOrigen = false }: ComentariosPanelProps) {
  const { data: comentarios, isLoading, isError, error, refetch } = useComments(proyectoId, filtro);
  const { mutate: crear, isPending: creando } = useCreateComment(proyectoId);
  const { mutate: editar } = useUpdateComment(proyectoId);
  const { mutate: borrar } = useRemoveComment(proyectoId);
  const confirm = useConfirm();
  const currentUser = useAuthStore((state) => state.user);
  const activeRole = useActivePerspective();
  const composerId = useId();
  const [texto, setTexto] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [textoEdicion, setTextoEdicion] = useState('');
  const { confirmDiscard } = useDiscardChanges(editandoId !== null, textoEdicion, false, editandoId ?? undefined);

  function handleCrear(event: React.FormEvent) {
    event.preventDefault();
    const limpio = texto.trim();
    if (!limpio) return;
    crear({ texto: limpio, tecnica: publicarEn }, { onSuccess: () => setTexto('') });
  }

  function puedeGestionar(autorId: string) {
    return activeRole === 'ADMIN' || currentUser?.id === autorId;
  }

  async function iniciarEdicion(comentarioId: string, textoActual: string) {
    if (!(await confirmDiscard())) return;
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
    <>
      <form onSubmit={handleCrear} className="comment-composer">
        <span className="comment-avatar" aria-hidden="true">{(currentUser?.nombre ?? 'U').charAt(0).toUpperCase()}</span>
        <label className="sr-only" htmlFor={composerId}>Nuevo comentario</label>
        <textarea id={composerId} placeholder={'Escribe una observación o decisión\u2026'} value={texto} onChange={(event) => setTexto(event.target.value)} required rows={3} />
        <div className="comment-composer-actions">
          <small>{texto.trim().length} caracteres</small>
          <button type="submit" className="primary" disabled={creando || !texto.trim()}>{creando ? 'Publicando\u2026' : 'Publicar comentario'}</button>
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
                  <button type="button" className="secondary" onClick={async () => { if (await confirmDiscard()) cancelarEdicion(); }}>Cancelar</button>
                  <button type="button" className="primary" disabled={!textoEdicion.trim()} onClick={() => guardarEdicion(comentario.id)}>Guardar cambios</button>
                </div>
              </div>
            ) : (
              <div className="comment-body">
                <header>
                  <div><strong>{comentario.autor.nombre}</strong><time dateTime={comentario.createdAt}>{formatearFecha(comentario.createdAt)}</time></div>
                  {mostrarOrigen && <span className="chip" data-testid="comment-origen">{etiquetaOrigen(comentario.tecnica)}</span>}
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
    </>
  );
}
