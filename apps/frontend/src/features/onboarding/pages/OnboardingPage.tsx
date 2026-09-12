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
import { useParams } from 'react-router-dom';
import { accessProject, registerConsent, OnboardingApiError } from '../api/onboarding.api';
import { guardarSesionParticipante } from '../store/useParticipantSession';

type Paso = 'acceso' | 'consentimiento' | 'listo';

export function OnboardingPage() {
  const { proyectoId } = useParams<{ proyectoId: string }>();
  const [paso, setPaso] = useState<Paso>('acceso');
  const [participanteId, setParticipanteId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!proyectoId) {
    return (
      <main className="onboarding">
        <p role="alert">Este enlace no incluye un proyecto válido. Pide al evaluador el link completo.</p>
      </main>
    );
  }

  async function handleAcceder() {
    setCargando(true);
    setError(null);
    try {
      const { access_token, participant } = await accessProject(proyectoId!);
      guardarSesionParticipante({
        token: access_token,
        participanteId: participant.id,
        proyectoId: participant.proyectoId,
      });
      setParticipanteId(participant.id);
      setPaso('consentimiento');
    } catch (e) {
      setError(e instanceof OnboardingApiError ? e.message : 'No se pudo acceder al proyecto.');
    } finally {
      setCargando(false);
    }
  }

  async function handleConsentir(aceptado: boolean) {
    if (!participanteId) return;
    setCargando(true);
    setError(null);
    try {
      await registerConsent(participanteId, proyectoId!, aceptado);
      setPaso(aceptado ? 'listo' : 'acceso');
    } catch (e) {
      setError(e instanceof OnboardingApiError ? e.message : 'No se pudo registrar tu respuesta.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="onboarding">
      {error && <p role="alert" className="onboarding-error">{error}</p>}

      {paso === 'acceso' && (
        <section>
          <h1>Participar en este estudio</h1>
          <p>
            No necesitas crear una cuenta ni entregar tu nombre o correo. Solo pulsa
            «Ingresar» para comenzar.
          </p>
          <button type="button" onClick={handleAcceder} disabled={cargando}>
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </section>
      )}

      {paso === 'consentimiento' && (
        <section>
          <h1>Consentimiento informado</h1>
          <p>
            Tu participación es anónima y voluntaria. Los datos recolectados se usan
            únicamente con fines de investigación UX.
          </p>
          <div>
            <button type="button" onClick={() => handleConsentir(true)} disabled={cargando}>
              {cargando ? 'Enviando…' : 'Acepto participar'}
            </button>
            <button type="button" onClick={() => handleConsentir(false)} disabled={cargando}>
              No acepto
            </button>
          </div>
        </section>
      )}

      {paso === 'listo' && (
        <section>
          <h1>¡Listo!</h1>
          <p>Ya puedes continuar con el estudio.</p>
        </section>
      )}
    </main>
  );
}
