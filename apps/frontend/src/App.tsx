// apps/frontend/src/App.tsx

import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './shared/routing/ProtectedRoute';
import { PerspectiveRoute } from './shared/routing/PerspectiveRoute';
import { AppLayout } from './layouts/AppLayout';
import { ProjectDetailLayout } from './layouts/ProjectDetailLayout';
const LoginPage = lazy(() => import('./features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const OnboardingPage = lazy(() => import('./features/onboarding/pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
const ParticipantCardSortingPage = lazy(() => import('./features/onboarding/pages/ParticipantCardSortingPage').then((m) => ({ default: m.ParticipantCardSortingPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const ProjectOverviewPage = lazy(() => import('./pages/ProjectOverviewPage').then((m) => ({ default: m.ProjectOverviewPage })));
const PersonasPage = lazy(() => import('./pages/PersonasPage').then((m) => ({ default: m.PersonasPage })));
const JourneyMapPage = lazy(() => import('./pages/JourneyMapPage').then((m) => ({ default: m.JourneyMapPage })));
const MomentosCriticosPage = lazy(() => import('./pages/MomentosCriticosPage').then((m) => ({ default: m.MomentosCriticosPage })));
const CardSortingPage = lazy(() => import('./pages/CardSortingPage').then((m) => ({ default: m.CardSortingPage })));
const CardSortingWorkspacePage = lazy(() => import('./features/card-sorting/pages/CardSortingWorkspacePage').then((m) => ({ default: m.CardSortingWorkspacePage })));
const CardSortingResultsPage = lazy(() => import('./features/card-sorting/pages/CardSortingResultsPage').then((m) => ({ default: m.CardSortingResultsPage })));
const EvaluacionHeuristicaPage = lazy(() => import('./pages/EvaluacionHeuristicaPage').then((m) => ({ default: m.EvaluacionHeuristicaPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const ProjectMembersPage = lazy(() => import('./pages/ProjectMembersPage').then((m) => ({ default: m.ProjectMembersPage })));
const ProjectCommentsPage = lazy(() => import('./pages/ProjectCommentsPage').then((m) => ({ default: m.ProjectCommentsPage })));
const ProjectParticipantsPage = lazy(() => import('./pages/ProjectParticipantsPage').then((m) => ({ default: m.ProjectParticipantsPage })));
const ProfesorSalasPage = lazy(() => import('./features/salas/pages/ProfesorSalasPage').then((m) => ({ default: m.ProfesorSalasPage })));
const SalaDetallePage = lazy(() => import('./features/salas/pages/SalaDetallePage').then((m) => ({ default: m.SalaDetallePage })));
const SalasEliminadasPage = lazy(() => import('./features/salas/pages/SalasEliminadasPage').then((m) => ({ default: m.SalasEliminadasPage })));
const AdminProfesoresPage = lazy(() => import('./features/admin/pages/AdminProfesoresPage').then((m) => ({ default: m.AdminProfesoresPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

export default function App() {
  return (
    <Suspense fallback={<div className="route-loading" role="status">Cargando pantalla…</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      {/* Público — participante sin cuenta (Fase 1, PLAN_AJUSTES.md) */}
      <Route path="/participar/:proyectoId" element={<OnboardingPage />} />
      <Route path="/participar/sesion/:sesionId" element={<ParticipantCardSortingPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/proyectos" element={<ProjectsPage />} />
          
          <Route element={<PerspectiveRoute allowed={['ESTUDIANTE', 'DOCENTE', 'ADMIN']} />}>
            <Route path="/salas" element={<ProfesorSalasPage />} />
            <Route path="/salas/:salaId" element={<SalaDetallePage />} />
          </Route>

          <Route element={<PerspectiveRoute allowed={['DOCENTE', 'ADMIN']} />}>
            <Route path="/salas/eliminadas" element={<SalasEliminadasPage />} />
          </Route>

          <Route element={<PerspectiveRoute allowed={['ADMIN']} />}>
            <Route path="/admin" element={<AdminProfesoresPage />} />
            <Route path="/admin/profesores" element={<AdminProfesoresPage />} />
          </Route>

          <Route path="/proyectos/:proyectoId" element={<ProjectDetailLayout />}>
            <Route index element={<ProjectOverviewPage />} />
            <Route path="personas" element={<PersonasPage />} />
            <Route path="journey-map" element={<JourneyMapPage />} />
            <Route path="momentos-criticos" element={<MomentosCriticosPage />} />
            <Route path="card-sorting" element={<CardSortingPage />} />
            <Route path="card-sorting/:estudioId" element={<CardSortingWorkspacePage />} />
            <Route path="card-sorting/:estudioId/resultados" element={<CardSortingResultsPage />} />
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
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
