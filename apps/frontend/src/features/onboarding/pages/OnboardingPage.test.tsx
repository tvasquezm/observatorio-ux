import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SesionExpiradaError } from '../../../shared/api/api-client';
import { OnboardingPage } from './OnboardingPage';
import { accessProject, resumeProject } from '../api/onboarding.api';
import { joinCardSortingSession } from '../api/participant-card-sorting.api';

vi.mock('../api/onboarding.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/onboarding.api')>()),
  accessProject: vi.fn(),
  resumeProject: vi.fn(),
  registerConsent: vi.fn(),
}));

vi.mock('../api/participant-card-sorting.api', () => ({
  joinCardSortingSession: vi.fn(),
}));

const PROJECT_ID = 'f1e1b6a1-0001-4a11-9c00-000000000002';
const STUDY_ID = 'f1e1b6a1-0002-4a11-9c00-000000000003';
const PARTICIPANT_ID = '418ab86f-4605-4fc8-8a49-245c4a80d9e0';
const SESSION_ID = 'c1a9aa59-857c-46e8-b7f6-5e20d8eec052';
const RESUME_TOKEN = 'resume-token-seguro-con-mas-de-32-caracteres';

function renderOnboarding() {
  return render(
    <MemoryRouter initialEntries={[`/participar/${PROJECT_ID}?estudio=${STUDY_ID}`]}>
      <Routes>
        <Route path="/participar/:proyectoId" element={<OnboardingPage />} />
        <Route path="/participar/sesion/:sesionId" element={<p>Sesión recuperada</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function guardarSesionLocal(token = 'token-vigente') {
  sessionStorage.setItem('participanteToken', token);
  sessionStorage.setItem('participanteResumeToken', RESUME_TOKEN);
  sessionStorage.setItem('participanteId', PARTICIPANT_ID);
  sessionStorage.setItem('proyectoId', PROJECT_ID);
}

describe('OnboardingPage reanuda Card Sorting', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => sessionStorage.clear());

  it('reutiliza la sesión existente al abrir nuevamente el mismo enlace', async () => {
    guardarSesionLocal();
    vi.mocked(joinCardSortingSession).mockResolvedValue({ id: SESSION_ID } as never);
    renderOnboarding();

    await userEvent.click(screen.getByRole('button', { name: 'Continuar al consentimiento' }));

    expect(await screen.findByText('Sesión recuperada')).toBeInTheDocument();
    expect(joinCardSortingSession).toHaveBeenCalledWith(STUDY_ID);
    expect(accessProject).not.toHaveBeenCalled();
  });

  it('renueva un token vencido y conserva la identidad y sesión', async () => {
    guardarSesionLocal('token-vencido');
    vi.mocked(joinCardSortingSession)
      .mockRejectedValueOnce(new SesionExpiradaError())
      .mockResolvedValueOnce({ id: SESSION_ID } as never);
    vi.mocked(resumeProject).mockResolvedValue({
      access_token: 'token-renovado',
      resume_token: RESUME_TOKEN,
      participant: { id: PARTICIPANT_ID, proyectoId: PROJECT_ID },
    });
    renderOnboarding();

    await userEvent.click(screen.getByRole('button', { name: 'Continuar al consentimiento' }));

    expect(await screen.findByText('Sesión recuperada')).toBeInTheDocument();
    expect(resumeProject).toHaveBeenCalledWith(PARTICIPANT_ID, PROJECT_ID, RESUME_TOKEN);
    expect(sessionStorage.getItem('participanteToken')).toBe('token-renovado');
    expect(accessProject).not.toHaveBeenCalled();
  });
});
