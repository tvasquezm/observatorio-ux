// apps/frontend/src/features/onboarding/pages/ParticipantCardSortingPage.tsx
//
// Pantalla del PARTICIPANTE tras unirse a un estudio de Card Sorting
// (ver OnboardingPage). Drag & drop nativo (HTML5 DnD), sin librería
// externa. El progreso se cachea en localStorage por sesionId para no
// perderlo si el token expira o la página se recarga.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getParticipantCardSortingSession,
  submitCardSortingResult,
  type ParticipantCardSortingSession,
  type GrupoResultado,
} from '../api/participant-card-sorting.api';
import { SesionExpiradaError } from '../../../shared/api/api-client';
import { notify } from '../../../shared/api/toast';
import { CardSortingWorkspace } from '../../card-sorting/components/CardSortingWorkspace';
import { resumeProject } from '../api/onboarding.api';
import {
  guardarSesionParticipante,
  leerSesionParticipante,
} from '../store/useParticipantSession';

interface ProgresoCache {
  // cardId -> categoriaId (predefinida) o nombre de categoría (propia; ABIERTO/HIBRIDO)
  asignaciones: Record<string, string>;
  // ABIERTO/HIBRIDO: nombres de categorías que el participante fue creando.
  categoriasCreadas: string[];
  // questionId -> texto de la respuesta (preguntas opcionales del evaluador).
  respuestas: Record<string, string>;
}

function claveCache(sesionId: string) {
  return `cardSorting:progreso:${sesionId}`;
}

function leerCache(sesionId: string): ProgresoCache {
  try {
    const raw = localStorage.getItem(claveCache(sesionId));
    if (!raw) return { asignaciones: {}, categoriasCreadas: [], respuestas: {} };
    const parsed = JSON.parse(raw);
    return {
      asignaciones: parsed.asignaciones ?? {},
      categoriasCreadas: parsed.categoriasCreadas ?? [],
      respuestas: parsed.respuestas ?? {},
    };
  } catch {
    return { asignaciones: {}, categoriasCreadas: [], respuestas: {} };
  }
}

function guardarCache(sesionId: string, progreso: ProgresoCache) {
  localStorage.setItem(claveCache(sesionId), JSON.stringify(progreso));
}

function limpiarCache(sesionId: string) {
  localStorage.removeItem(claveCache(sesionId));
}

export function ParticipantCardSortingPage() {
  const { sesionId } = useParams<{ sesionId: string }>();
  const [sesion, setSesion] = useState<ParticipantCardSortingSession | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sesionExpirada, setSesionExpirada] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const [asignaciones, setAsignaciones] = useState<Record<string, string>>({});
  const [categoriasCreadas, setCategoriasCreadas] = useState<string[]>([]);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [introVista, setIntroVista] = useState(false);

  useEffect(() => {
    if (!sesionId) return;
    const cache = leerCache(sesionId);
    setAsignaciones(cache.asignaciones);
    setCategoriasCreadas(cache.categoriasCreadas);
    setRespuestas(cache.respuestas);

    (async () => {
      try {
        setCargando(true);
        const data = await getParticipantCardSortingSession(sesionId);
        setSesion(data);
      } catch (e) {
        if (e instanceof SesionExpiradaError) {
          const stored = leerSesionParticipante();
          if (!stored?.resumeToken) {
            setSesionExpirada(true);
          } else {
            try {
              const renewed = await resumeProject(
                stored.participanteId,
                stored.proyectoId,
                stored.resumeToken,
              );
              guardarSesionParticipante({
                token: renewed.access_token,
                resumeToken: renewed.resume_token ?? stored.resumeToken,
                participanteId: renewed.participant.id,
                proyectoId: renewed.participant.proyectoId,
              });
              const data = await getParticipantCardSortingSession(sesionId);
              setSesion(data);
            } catch (resumeError) {
              setError(
                resumeError instanceof Error
                  ? resumeError.message
                  : 'No se pudo reanudar la participación.',
              );
              setSesionExpirada(true);
            }
          }
        } else {
          setError(e instanceof Error ? e.message : 'No se pudo cargar el estudio.');
        }
      } finally {
        setCargando(false);
      }
    })();
  }, [sesionId]);

  // Persiste cada cambio — así un reload o una expiración de token no
  // borra lo ya clasificado.
  useEffect(() => {
    if (!sesionId) return;
    guardarCache(sesionId, { asignaciones, categoriasCreadas, respuestas });
  }, [sesionId, asignaciones, categoriasCreadas, respuestas]);

  const estudioCerrado = sesion?.estudio.cerrado ?? false;

  async function handleEnviar(grupos: GrupoResultado[]) {
    if (!sesion || !sesionId) return;
    setEnviando(true);
    setError(null);
    try {
      const preguntasIds = new Set((sesion.estudio.preguntas ?? []).map((p) => p.id));
      const respuestasEnvio = Object.entries(respuestas)
        .filter(([questionId, texto]) => preguntasIds.has(questionId) && texto.trim() !== '')
        .map(([questionId, texto]) => ({ questionId, respuesta: texto.trim() }));
      await submitCardSortingResult(sesionId, grupos, respuestasEnvio);
      limpiarCache(sesionId);
      setEnviado(true);
      notify.success('¡Gracias! Tus respuestas fueron enviadas.');
    } catch (e) {
      if (e instanceof SesionExpiradaError) {
        setSesionExpirada(true);
      } else {
        setError(e instanceof Error ? e.message : 'No se pudo enviar el resultado.');
      }
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <main className="onboarding participant-entry">
        <section className="participant-card participant-state">
          <div className="participant-loader" aria-hidden="true" />
          <h1>Preparando el estudio</h1>
          <p>Cargando tarjetas y categorías…</p>
        </section>
      </main>
    );
  }

  if (sesionExpirada) {
    return (
      <main className="onboarding participant-entry">
        <section className="participant-card participant-state">
          <span className="participant-state-mark" aria-hidden="true">↻</span>
          <h1>La sesión expiró</h1>
          <p role="alert" className="onboarding-error">
          No pudimos renovar esta participación automáticamente. Vuelve a abrir el enlace
          original; si la sesión es anterior a esta actualización, puede ser necesario comenzar
          una clasificación nueva.
          </p>
        </section>
      </main>
    );
  }

  if (error && !sesion) {
    return (
      <main className="onboarding participant-entry">
        <section className="participant-card participant-state">
          <span className="participant-state-mark" aria-hidden="true">!</span>
          <h1>No pudimos abrir el estudio</h1>
          <p role="alert" className="onboarding-error">{error}</p>
        </section>
      </main>
    );
  }

  if (!sesion) return null;

  if (enviado || sesion.estado === 'COMPLETADO') {
    return (
      <main className="onboarding participant-entry">
        <section className="participant-card participant-state">
          <span className="participant-complete" aria-hidden="true">✓</span>
          <h1>Clasificación enviada</h1>
          <p>Gracias por participar. Ya puedes cerrar esta ventana.</p>
        </section>
      </main>
    );
  }

  if (estudioCerrado) {
    return (
      <main className="onboarding participant-entry">
        <section className="participant-card participant-state">
          <span className="participant-state-mark" aria-hidden="true">—</span>
          <h1>Estudio cerrado</h1>
          <p role="alert" className="onboarding-error">
          Este estudio ya no acepta envíos — el evaluador lo cerró. Tu clasificación no se pudo
          enviar.
          </p>
        </section>
      </main>
    );
  }

  // La intro se omite si ya hay progreso guardado (recarga o regreso).
  const hayProgreso = Object.keys(asignaciones).length > 0 || categoriasCreadas.length > 0;
  if (!introVista && !hayProgreso) {
    const tipo = sesion.estudio.tipoCardSorting;
    return (
      <main className="onboarding participant-entry">
        <section className="participant-card participant-intro" aria-labelledby="participant-intro-title">
          <span className="eyebrow">Card Sorting · Participación anónima</span>
          <h1 id="participant-intro-title">{sesion.estudio.nombre}</h1>
          <ul>
            <li>No hay respuestas correctas: agrupa las tarjetas según cómo las relacionas tú.</li>
            <li>
              {tipo === 'ABIERTO'
                ? 'Crea tus propias categorías y ponles el nombre que mejor las describa.'
                : tipo === 'HIBRIDO'
                  ? 'Usa las categorías que se te muestran o crea las tuyas si ninguna encaja.'
                  : 'Usa las categorías que se te muestran; no puedes crear nuevas.'}
            </li>
            <li>
              Son {sesion.estudio.cardsDefinidas.length} tarjetas y debes ubicarlas todas antes de enviar.
            </li>
            <li>Tu avance se guarda en este dispositivo. No escribas datos personales.</li>
          </ul>
          <button type="button" className="primary" onClick={() => setIntroVista(true)}>
            Comenzar
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="onboarding participant-study">
      <header className="participant-study-head">
        <img src="/brand/uxlab-observatorio.webp" width="1760" height="440" alt="UXLab Observatorio" />
        <div>
          <span className="eyebrow">Card Sorting · Participación anónima</span>
          <h1>{sesion.estudio.nombre}</h1>
          <p>Organiza todas las tarjetas según la relación que encuentres entre ellas. Tu avance se guarda en este dispositivo.</p>
        </div>
      </header>

      {error && <p role="alert" className="onboarding-error">{error}</p>}

      <CardSortingWorkspace
        study={sesion.estudio}
        assignments={asignaciones}
        customCategories={categoriasCreadas}
        onAssignmentsChange={setAsignaciones}
        onCustomCategoriesChange={setCategoriasCreadas}
        answers={respuestas}
        onAnswersChange={setRespuestas}
        onSubmit={handleEnviar}
        submitting={enviando}
      />
    </main>
  );
}
