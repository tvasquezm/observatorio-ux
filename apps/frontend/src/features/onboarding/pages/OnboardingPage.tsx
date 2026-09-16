// apps/frontend/src/features/onboarding/pages/OnboardingPage.tsx
//
// Fase 1 (PLAN_AJUSTES.md): landing pública del participante. Sin form
// de Nombre/Correo — un botón que llama a POST /auth/participants/access
// con el proyectoId de la URL (link/QR) y, tras aceptar el
// consentimiento, deja la sesión de participante lista para usarse en
// el resto de la app (ver useParticipantSession).
//
// Estructura básica funcional (ver "Nota de alcance frontend" del plan):
// sin trabajo de estilos/UI final, eso lo hace después el resto del equipo.

import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  accessProject,
  resumeProject,
  registerConsent,
  OnboardingApiError,
  type ParticipantAccessResponse,
} from '../api/onboarding.api';
import {
  guardarSesionParticipante,
  leerSesionParticipante,
  limpiarSesionParticipante,
  type ParticipantSession,
} from '../store/useParticipantSession';
import { joinCardSortingSession } from '../api/participant-card-sorting.api';
import { ApiRequestError, SesionExpiradaError } from '../../../shared/api/api-client';

type Paso = 'acceso' | 'consentimiento' | 'listo' | 'uniendo';

const PASOS: Array<{ id: 'acceso' | 'consentimiento' | 'listo'; label: string }> = [
  { id: 'acceso', label: 'Acceso' },
  { id: 'consentimiento', label: 'Consentimiento' },
  { id: 'listo', label: 'Estudio' },
];

export function OnboardingPage() {
  const { proyectoId } = useParams<{ proyectoId: string }>();
  const [searchParams] = useSearchParams();
  const estudioId = searchParams.get('estudio');
  const navigate = useNavigate();
  const [paso, setPaso] = useState<Paso>('acceso');
  const [participanteId, setParticipanteId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!proyectoId) {
    return (
      <main className="onboarding participant-entry">
        <header className="participant-brand">
          <img src="/brand/uxlab-observatorio-white.webp" width="1760" height="440" alt="UXLab Observatorio" />
          <span>Participación anónima</span>
        </header>
        <section className="participant-card participant-step participant-state">
          <span className="participant-complete participant-warning" aria-hidden="true">!</span>
          <h1>Este enlace está incompleto</h1>
          <p role="alert">Pide al evaluador el enlace o código QR completo para acceder al proyecto.</p>
        </section>
        <footer className="participant-footer">UXLab Observatorio · Universidad Tecnológica Metropolitana</footer>
      </main>
    );
  }
  const activeProjectId = proyectoId;

  function guardarAcceso(
    response: ParticipantAccessResponse,
    resumeTokenAnterior?: string,
  ): ParticipantSession {
    const session = {
      token: response.access_token,
      resumeToken: response.resume_token ?? resumeTokenAnterior,
      participanteId: response.participant.id,
      proyectoId: response.participant.proyectoId,
    };
    guardarSesionParticipante(session);
    setParticipanteId(session.participanteId);
    return session;
  }

  async function renovarAcceso(session: ParticipantSession) {
    if (!session.resumeToken) {
      throw new OnboardingApiError(401, 'Esta participación es anterior y no se puede reanudar.');
    }
    const response = await resumeProject(
      session.participanteId,
      session.proyectoId,
      session.resumeToken,
    );
    return guardarAcceso(response, session.resumeToken);
  }

  function requiereConsentimiento(errorValue: unknown) {
    return errorValue instanceof ApiRequestError &&
      errorValue.status === 403 &&
      errorValue.message.toLocaleLowerCase('es-CL').includes('consentimiento');
  }

  async function handleAcceder() {
    setCargando(true);
    setError(null);
    try {
      const stored = leerSesionParticipante();
      if (stored && stored.proyectoId === activeProjectId) {
        setParticipanteId(stored.participanteId);

        if (!estudioId) {
          setPaso('consentimiento');
          return;
        }

        try {
          const sesion = await joinCardSortingSession(estudioId);
          navigate(`/participar/sesion/${sesion.id}`, { replace: true });
          return;
        } catch (joinError) {
          if (requiereConsentimiento(joinError)) {
            setPaso('consentimiento');
            return;
          }
          if (joinError instanceof SesionExpiradaError) {
            try {
              await renovarAcceso(stored);
              const sesion = await joinCardSortingSession(estudioId);
              navigate(`/participar/sesion/${sesion.id}`, { replace: true });
              return;
            } catch (resumeError) {
              if (
                resumeError instanceof OnboardingApiError &&
                resumeError.status === 403 &&
                resumeError.message.toLocaleLowerCase('es-CL').includes('consentimiento')
              ) {
                setPaso('consentimiento');
                return;
              }
              limpiarSesionParticipante();
            }
          } else {
            throw joinError;
          }
        }
      }

      const response = await accessProject(activeProjectId);
      guardarAcceso(response);
      setPaso('consentimiento');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo acceder al proyecto.');
    } finally {
      setCargando(false);
    }
  }

  async function handleConsentir(aceptado: boolean) {
    if (!participanteId) return;
    setCargando(true);
    setError(null);
    try {
      await registerConsent(participanteId, activeProjectId, aceptado);
      if (!aceptado) {
        limpiarSesionParticipante();
        setParticipanteId(null);
        setPaso('acceso');
        return;
      }
      if (estudioId) {
        setPaso('uniendo');
        let sesion;
        try {
          sesion = await joinCardSortingSession(estudioId);
        } catch (joinError) {
          if (!(joinError instanceof SesionExpiradaError)) throw joinError;
          const stored = leerSesionParticipante();
          if (!stored || stored.proyectoId !== activeProjectId) throw joinError;
          await renovarAcceso(stored);
          sesion = await joinCardSortingSession(estudioId);
        }
        navigate(`/participar/sesion/${sesion.id}`, { replace: true });
        return;
      }
      setPaso('listo');
    } catch (e) {
      const mensaje =
        e instanceof OnboardingApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'No se pudo continuar. Intenta de nuevo.';
      setError(mensaje);
      setPaso('consentimiento');
    } finally {
      setCargando(false);
    }
  }

  const currentStepIndex = paso === 'uniendo'
    ? 2
    : PASOS.findIndex((candidate) => candidate.id === paso);

  return (
    <main className="onboarding participant-entry">
      <header className="participant-brand">
        <img src="/brand/uxlab-observatorio-white.webp" width="1760" height="440" alt="UXLab Observatorio" />
        <span>Participación anónima</span>
      </header>

      <section className="participant-card" aria-live="polite">
        <ol className="participant-steps" aria-label="Progreso">
          {PASOS.map((item, index) => {
            return (
              <li key={item.id} className={index <= currentStepIndex ? 'active' : ''} aria-current={item.id === paso ? 'step' : undefined}>
                <span>{index + 1}</span>{item.label}
              </li>
            );
          })}
        </ol>

        {error && <p role="alert" className="onboarding-error">{error}</p>}

        {paso === 'acceso' && (
          <div className="participant-step">
            <span className="eyebrow">Estudio de experiencia usuaria</span>
            <h1>Tu perspectiva ayuda a mejorar el diseño.</h1>
            <p>No necesitas crear una cuenta ni compartir tu nombre o correo. El acceso es anónimo y toma solo unos segundos.</p>
            <ul className="participant-trust-list">
              <li><strong>Sin registro</strong><span>No pediremos datos personales.</span></li>
              <li><strong>Participación voluntaria</strong><span>Puedes decidir si continuar.</span></li>
              <li><strong>Uso académico</strong><span>Las respuestas apoyan investigación UX.</span></li>
            </ul>
            <button type="button" className="primary participant-primary" onClick={handleAcceder} disabled={cargando}>
              {cargando ? 'Preparando acceso…' : 'Continuar al consentimiento'}
            </button>
          </div>
        )}

        {paso === 'consentimiento' && (
          <div className="participant-step">
            <span className="eyebrow">Antes de comenzar</span>
            <h1>Consentimiento informado</h1>
            <p>Tu participación es anónima y voluntaria. Las respuestas se usarán únicamente para analizar patrones de experiencia usuaria.</p>
            <div className="consent-note">
              <strong>Tú mantienes el control</strong>
              <p>Puedes rechazar la participación ahora. Si aceptas, podrás completar la actividad sin identificarte.</p>
            </div>
            <div className="participant-actions">
              <button type="button" className="primary" onClick={() => handleConsentir(true)} disabled={cargando}>{cargando ? 'Registrando decisión…' : 'Acepto participar'}</button>
              <button type="button" className="secondary" onClick={() => handleConsentir(false)} disabled={cargando}>No deseo participar</button>
            </div>
          </div>
        )}

        {paso === 'uniendo' && (
          <div className="participant-step participant-state">
            <div className="participant-loader" aria-hidden="true" />
            <h1>Preparando la actividad</h1>
            <p>Estamos abriendo el estudio. Esto tomará un momento.</p>
          </div>
        )}

        {paso === 'listo' && (
          <div className="participant-step participant-state">
            <span className="participant-complete" aria-hidden="true">✓</span>
            <h1>Acceso confirmado</h1>
            <p>Tu consentimiento quedó registrado. Ya puedes continuar con el estudio.</p>
          </div>
        )}
      </section>

      <footer className="participant-footer">UXLab Observatorio · Universidad Tecnológica Metropolitana</footer>
    </main>
  );
}
