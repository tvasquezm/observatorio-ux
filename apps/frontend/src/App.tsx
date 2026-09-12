// apps/frontend/src/App.tsx

import { Routes, Route } from 'react-router-dom';
import { LoginPage } from './features/auth/pages/LoginPage';
import { OnboardingPage } from './features/onboarding/pages/OnboardingPage';
import { ProtectedRoute } from './shared/routing/ProtectedRoute';
import { PerspectiveRoute } from './shared/routing/PerspectiveRoute';
import { AppLayout } from './layouts/AppLayout';
import { ProjectDetailLayout } from './layouts/ProjectDetailLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectOverviewPage } from './pages/ProjectOverviewPage';
import { PersonasPage } from './pages/PersonasPage';
import { JourneyMapPage } from './pages/JourneyMapPage';
import { MomentosCriticosPage } from './pages/MomentosCriticosPage';
import { CardSortingPage } from './pages/CardSortingPage';
import { EvaluacionHeuristicaPage } from './pages/EvaluacionHeuristicaPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ProjectMembersPage } from './pages/ProjectMembersPage';
import { ProjectCommentsPage } from './pages/ProjectCommentsPage';
import { ProjectParticipantsPage } from './pages/ProjectParticipantsPage';
import { ProfesorSalasPage } from './features/salas/pages/ProfesorSalasPage';
import { SalaDetallePage } from './features/salas/pages/SalaDetallePage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Público — participante sin cuenta (Fase 1, PLAN_AJUSTES.md) */}
      <Route path="/participar/:proyectoId" element={<OnboardingPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/proyectos" element={<ProjectsPage />} />
          
          <Route element={<PerspectiveRoute allowed={['ESTUDIANTE', 'DOCENTE', 'ADMIN']} />}>
            <Route path="/salas" element={<ProfesorSalasPage />} />
            <Route path="/salas/:salaId" element={<SalaDetallePage />} />
          </Route>

          <Route path="/proyectos/:proyectoId" element={<ProjectDetailLayout />}>
            <Route index element={<ProjectOverviewPage />} />
            <Route path="personas" element={<PersonasPage />} />
            <Route path="journey-map" element={<JourneyMapPage />} />
            <Route path="momentos-criticos" element={<MomentosCriticosPage />} />
            <Route path="card-sorting" element={<CardSortingPage />} />
            <Route path="evaluacion-heuristica" element={<EvaluacionHeuristicaPage />} />
            <Route path="comentarios" element={<ProjectCommentsPage />} />
            <Route element={<PerspectiveRoute allowed={['DOCENTE', 'ADMIN']} />}>
              <Route path="analitica" element={<AnalyticsPage />} />
            </Route>
            <Route path="miembros" element={<ProjectMembersPage />} />
            <Route path="participantes" element={<ProjectParticipantsPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
