import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/useAuthStore';
import {
  useCardSortingSession,
  useCreateCardSortingShareLink,
  useCloseCardSortingStudy,
  useSubmitStudentCardSortingResult,
} from '../hooks/useCardSortingQueries';
<<<<<<< Updated upstream
import { CardSortingWorkspace } from '../components/CardSortingWorkspace';
=======
import { notify } from '../../../shared/api/toast';
import { useAuthStore } from '../../auth/store/useAuthStore';
>>>>>>> Stashed changes

export function CardSortingWorkspacePage() {
  const { estudioId } = useParams<{ estudioId: string }>();
  const navigate = useNavigate();
<<<<<<< Updated upstream
  const user = useAuthStore((state) => state.user);
  const { data: session, isLoading, error } = useCardSortingSession(estudioId ?? null);
  const shareLink = useCreateCardSortingShareLink();
  const selfSubmit = useSubmitStudentCardSortingResult();
  const closeStudy = useCloseCardSortingStudy();
  const [participantLink, setParticipantLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
=======
  const sessionQuery = useCardSortingSession(estudioId ?? null);
  const closeStudy = useCerrarCardSortingEstudio();
  const user = useAuthStore((state) => state.user);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [customCategories, setCustomCategories] = useState<string[]>([]);
>>>>>>> Stashed changes

  if (isLoading) return <div className="panel">Cargando la técnica…</div>;

<<<<<<< Updated upstream
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
=======
  const session = sessionQuery.data;
  // Solo el estudiante dueño del estudio puede administrar el enlace y
  // cerrar/reabrir la técnica. Docentes y ADMIN mantienen acceso de lectura.
  const isStudentOwner =
    user?.rol === 'ESTUDIANTE' && !!session && session.evaluadorId === user.id;

  async function copyParticipantLink() {
    if (!session || !isStudentOwner) return;
    const link = `${window.location.origin}/participar/${session.proyectoId}?estudio=${session.id}`;
>>>>>>> Stashed changes
    try {
      const result = await shareLink.mutateAsync(estudioId);
      const url = `${window.location.origin}/card-sorting/participar/${result.urlToken}`;
      setParticipantLink(url);
      setCopied(false);
    } catch {
      setParticipantLink(null);
    }
  }

<<<<<<< Updated upstream
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
=======
  function toggleClosed() {
    if (!session || !isStudentOwner) return;
    closeStudy.mutate(
      { estudioId: session.id, cerrado: !session.cerrado },
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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
=======
      <section className="panel cs-share-bar">
        <div className="cs-share-copy">
          <span className="kicker">ESTADO DEL ESTUDIO</span>
          <strong>{session.cerrado ? 'El estudio está cerrado' : 'El estudio recibe respuestas'}</strong>
          {isStudentOwner && <code>{participantLink}</code>}
        </div>
        <div className="cs-share-actions">
          {isStudentOwner && (
            <>
              <button type="button" className="primary" onClick={copyParticipantLink}>
                Copiar enlace
              </button>
              <button
                type="button"
                className={session.cerrado ? 'secondary' : 'danger'}
                onClick={toggleClosed}
                disabled={closeStudy.isPending}
              >
                {closeStudy.isPending
                  ? 'Guardando…'
                  : session.cerrado
                    ? 'Reabrir estudio'
                    : 'Cerrar estudio'}
              </button>
            </>
          )}
          <Link className="secondary button-like" to="resultados">Ver resultados</Link>
        </div>
      </section>

      {closeStudy.error && isStudentOwner && (
        <p role="alert" className="error-text">{closeStudy.error.message}</p>
>>>>>>> Stashed changes
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
