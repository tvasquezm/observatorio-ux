import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useCardSortingSession,
  useJoinPublicCardSortingStudy,
  usePublicCardSortingStudy,
  useSubmitCardSortingResult,
} from '../hooks/useCardSortingQueries';
import { useCardSortingStore } from '../store/useCardSortingStore';
import { CardSortingWorkspace } from '../components/CardSortingWorkspace';

interface StoredParticipantAccess {
  sessionId: string;
  token: string;
}

export function CardSortingParticipantPage() {
  const { token } = useParams<{ token: string }>();
  const join = useJoinPublicCardSortingStudy();
  const submit = useSubmitCardSortingResult();
  const setParticipantSession = useCardSortingStore((state) => state.setParticipantSession);
  const clearParticipantSession = useCardSortingStore((state) => state.clearParticipantSession);
  const [submitted, setSubmitted] = useState(false);
  const [storedSessionId, setStoredSessionId] = useState<string | null>(null);
  const joinStarted = useRef(false);

  const publicStudy = usePublicCardSortingStudy(token ?? null);
  const sessionQuery = useCardSortingSession(storedSessionId, true);

  const storageKey = useMemo(
    () => (token ? `card-sorting-public:${token}` : null),
    [token],
  );

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<StoredParticipantAccess>;
      if (typeof saved.sessionId === 'string' && typeof saved.token === 'string') {
        localStorage.setItem('participanteToken', saved.token);
        setParticipantSession(token!, saved.sessionId);
        setStoredSessionId(saved.sessionId);
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey, token, setParticipantSession]);

  useEffect(() => {
    if (!token || !publicStudy.data || publicStudy.data.estado === 'COMPLETADO' || storedSessionId || joinStarted.current) return;
    joinStarted.current = true;
    join.mutate(token, {
      onSuccess: (result) => {
        localStorage.setItem('participanteToken', result.access_token);
        if (storageKey) {
          localStorage.setItem(
            storageKey,
            JSON.stringify({ sessionId: result.session.id, token: result.access_token }),
          );
        }
        setParticipantSession(token, result.session.id);
        setStoredSessionId(result.session.id);
      },
    });
  }, [token, publicStudy.data, storedSessionId, storageKey, join, setParticipantSession]);

  if (!token) {
    return <main className="public-technique-page"><div className="panel">Enlace de participación inválido.</div></main>;
  }

  if (publicStudy.isLoading || join.isPending || (storedSessionId && sessionQuery.isLoading)) {
    return <main className="public-technique-page"><div className="panel">Preparando la técnica…</div></main>;
  }

  if (publicStudy.data?.estado === 'COMPLETADO') {
    return (
      <main className="public-technique-page">
        <div className="panel">
          <span className="kicker">CARD SORTING</span>
          <h1>Técnica cerrada</h1>
          <p>Esta técnica ya fue cerrada y no acepta nuevas respuestas.</p>
        </div>
      </main>
    );
  }

  if (publicStudy.error || join.error || sessionQuery.error || !publicStudy.data) {
    const error = publicStudy.error ?? join.error ?? sessionQuery.error;
    return (
      <main className="public-technique-page">
        <div className="panel">
          <span className="kicker">PARTICIPANTE</span>
          <h1>No se pudo abrir la técnica</h1>
          <p className="error-text">
            {error instanceof Error ? error.message : 'El enlace no es válido o la técnica ya no está disponible.'}
          </p>
        </div>
      </main>
    );
  }

  const session = sessionQuery.data ?? join.data?.session;

  if (!session) {
    return <main className="public-technique-page"><div className="panel">Preparando la técnica…</div></main>;
  }

  if (submitted || session.estado === 'COMPLETADO') {
    return (
      <main className="public-technique-page">
        <div className="panel">
          <span className="kicker">CARD SORTING</span>
          <h1>Clasificación enviada</h1>
          <p>Tu respuesta fue registrada correctamente. Gracias por participar.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="public-technique-page fade">
      <CardSortingWorkspace
        session={session}
        participantMode
        submitting={submit.isPending}
        submitTitle="¿Terminaste de organizar las tarjetas?"
        submitHint="Cuando envíes tu clasificación, el resultado quedará disponible para el estudiante que creó el estudio."
        submitLabel="Enviar clasificación"
        onSubmit={(groups) => {
          submit.mutate(groups, {
            onSuccess: () => {
              setSubmitted(true);
              clearParticipantSession();
              if (storageKey) localStorage.removeItem(storageKey);
              localStorage.removeItem('participanteToken');
            },
          });
        }}
      />
    </main>
  );
}
