import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CardSortingWorkspace } from '../components/CardSortingWorkspace';
import {
  useCardSortingSession,
  useCerrarCardSortingEstudio,
} from '../hooks/useCardSortingQueries';
import { notify } from '../../../shared/api/toast';

export function CardSortingWorkspacePage() {
  const { estudioId } = useParams<{ estudioId: string }>();
  const navigate = useNavigate();
  const sessionQuery = useCardSortingSession(estudioId ?? null);
  const closeStudy = useCerrarCardSortingEstudio();
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  useEffect(() => {
    setAssignments({});
    setCustomCategories([]);
  }, [estudioId]);

  const session = sessionQuery.data;

  async function copyParticipantLink() {
    if (!session) return;
    const link = `${window.location.origin}/participar/${session.proyectoId}?estudio=${session.id}`;
    try {
      await navigator.clipboard.writeText(link);
      notify.success('Enlace de participación copiado.');
    } catch {
      notify.error('No se pudo copiar el enlace.');
    }
  }

  function toggleClosed() {
    if (!session) return;
    closeStudy.mutate(
      { estudioId: session.id, cerrado: !session.cerrado },
      {
        onSuccess: (updated) => {
          notify.success(updated.cerrado ? 'Estudio cerrado.' : 'Estudio reabierto.');
        },
      },
    );
  }

  if (sessionQuery.isLoading) return <div className="panel">Cargando estudio…</div>;

  if (sessionQuery.error || !session) {
    return (
      <section className="panel">
        <h2>No se pudo abrir el Card Sorting</h2>
        <p role="alert" className="error-text">
          {sessionQuery.error instanceof Error
            ? sessionQuery.error.message
            : 'El estudio no existe o no tienes acceso.'}
        </p>
        <button type="button" className="secondary" onClick={() => navigate(-1)}>Volver</button>
      </section>
    );
  }

  const participantLink = `${window.location.origin}/participar/${session.proyectoId}?estudio=${session.id}`;

  return (
    <div className="fade">
      <header className="page-head">
        <div>
          <span className="kicker">CARD SORTING · WORKSPACE</span>
          <h2>{session.nombre}</h2>
          <p>
            Prueba la interacción localmente, comparte el estudio y controla cuándo recibe
            respuestas. La práctica de esta pantalla no altera la analítica.
          </p>
        </div>
        <Link
          className="secondary button-like"
          to={`/proyectos/${session.proyectoId}/card-sorting`}
        >
          ← Todos los estudios
        </Link>
      </header>

      <section className="panel cs-share-bar">
        <div className="cs-share-copy">
          <span className="kicker">PARTICIPANTES</span>
          <strong>{session.cerrado ? 'El estudio está cerrado' : 'El estudio recibe respuestas'}</strong>
          <code>{participantLink}</code>
        </div>
        <div className="cs-share-actions">
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
          <Link className="secondary button-like" to="resultados">Ver resultados</Link>
        </div>
      </section>

      {closeStudy.error && <p role="alert" className="error-text">{closeStudy.error.message}</p>}

      <CardSortingWorkspace
        study={session}
        assignments={assignments}
        customCategories={customCategories}
        onAssignmentsChange={setAssignments}
        onCustomCategoriesChange={setCustomCategories}
        preview
      />
    </div>
  );
}
