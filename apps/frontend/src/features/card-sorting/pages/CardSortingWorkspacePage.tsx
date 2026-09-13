import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/useAuthStore';
import {
  useCardSortingSession,
  useCreateCardSortingShareLink,
  useCloseCardSortingStudy,
  useSubmitStudentCardSortingResult,
} from '../hooks/useCardSortingQueries';
import { CardSortingWorkspace } from '../components/CardSortingWorkspace';

export function CardSortingWorkspacePage() {
  const { estudioId } = useParams<{ estudioId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { data: session, isLoading, error } = useCardSortingSession(estudioId ?? null);
  const shareLink = useCreateCardSortingShareLink();
  const selfSubmit = useSubmitStudentCardSortingResult();
  const closeStudy = useCloseCardSortingStudy();
  const [participantLink, setParticipantLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (isLoading) return <div className="panel">Cargando la técnica…</div>;

  if (error || !session) {
    return (
      <div className="panel">
        <h2>No se pudo abrir el Card Sorting</h2>
        <p className="error-text">
          {error instanceof Error ? error.message : 'La sesión no existe o no tienes acceso.'}
        </p>
        <Link to="..">Volver</Link>
      </div>
    );
  }

  const isStudentOwner = user?.rol === 'ESTUDIANTE' || user?.rol === 'ADMIN';

  async function generateParticipantLink() {
    if (!estudioId || !isStudentOwner) return;
    try {
      const result = await shareLink.mutateAsync(estudioId);
      const url = `${window.location.origin}/card-sorting/participar/${result.urlToken}`;
      setParticipantLink(url);
      setCopied(false);
    } catch {
      setParticipantLink(null);
    }
  }

  async function copyParticipantLink() {
    if (!participantLink) return;
    try {
      await navigator.clipboard.writeText(participantLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  async function handleCloseStudy() {
    if (!estudioId || !isStudentOwner) return;
    if (!window.confirm('¿Cerrar esta técnica? Después de cerrarla no se aceptarán nuevas respuestas, pero se conservarán todas las respuestas recibidas.')) return;
    await closeStudy.mutateAsync(estudioId);
  }

  function handleStudentSubmit(groups: Array<{ categoriaId?: string; categoriaNombre?: string; cardIds: string[] }>) {
    if (!estudioId || !isStudentOwner) return;
    selfSubmit.mutate(
      { estudioId, grupos: groups },
      {
        onSuccess: () => {
          setSubmitted(true);
          navigate(`/proyectos/${session.proyectoId}/card-sorting/${session.id}/resultados`);
        },
      },
    );
  }

  return (
    <div className="fade">
      <div className="page-head">
        <div>
          <span className="kicker">TÉCNICA UX</span>
          <h1>{session.nombre}</h1>
          <p>
            Esta es la pantalla donde se aplica la técnica. El estudiante puede enviar su propia
            clasificación y, además, generar un enlace para participantes externos.
          </p>
        </div>
        <button type="button" className="secondary" onClick={() => navigate('..')}>
          ← Volver a configuración
        </button>
      </div>

      {isStudentOwner && (
        <section className="cs-share-bar panel">
          <div>
            <span className="kicker">PARTICIPANTES EXTERNOS</span>
            <strong>Comparte esta técnica con un participante</strong>
            <span>
              Estado: <strong>{session.estado === 'COMPLETADO' ? '🔴 CERRADA' : '🟢 ABIERTA'}</strong>. Cada respuesta recibida se acumula en la analítica.
            </span>
          </div>
          <div className="cs-share-actions">
            {participantLink && <code>{participantLink}</code>}
            <button
              type="button"
              className="primary"
              onClick={participantLink ? copyParticipantLink : generateParticipantLink}
              disabled={shareLink.isPending}
            >
              {shareLink.isPending
                ? 'Generando…'
                : participantLink
                  ? copied ? '✓ Enlace copiado' : 'Copiar enlace'
                  : 'Generar enlace'}
            </button>
            {session.estado !== 'COMPLETADO' && (
              <button type="button" className="secondary" onClick={handleCloseStudy} disabled={closeStudy.isPending}>
                {closeStudy.isPending ? 'Cerrando…' : '🔒 Cerrar técnica'}
              </button>
            )}
            <Link
              className="secondary button-like"
              to={`/proyectos/${session.proyectoId}/card-sorting/${session.id}/resultados`}
            >
              Ver resultados
            </Link>
          </div>
          {shareLink.error && (
            <p className="error-text">{(shareLink.error as Error).message}</p>
          )}
        </section>
      )}

      <CardSortingWorkspace
        session={session}
        participantMode={isStudentOwner && session.estado !== 'COMPLETADO'}
        submitting={selfSubmit.isPending}
        submitTitle="¿Terminaste de aplicar la técnica?"
        submitHint="Tu clasificación se guardará como un resultado del estudio y aparecerá en la analítica."
        submitLabel="Enviar resultados"
        onSubmit={isStudentOwner ? handleStudentSubmit : undefined}
      />

      {submitted && (
        <div className="panel" role="status">
          Resultado enviado correctamente. La analítica del estudio ya puede incluir esta aplicación.
        </div>
      )}
    </div>
  );
}
