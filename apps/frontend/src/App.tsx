// apps/frontend/src/App.tsx

import { Routes, Route } from 'react-router-dom';
import { LoginPage } from './features/auth/pages/LoginPage';
import { ProtectedRoute } from './shared/routing/ProtectedRoute';
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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/proyectos" element={<ProjectsPage />} />

          <Route path="/proyectos/:proyectoId" element={<ProjectDetailLayout />}>
            <Route index element={<ProjectOverviewPage />} />
            <Route path="personas" element={<PersonasPage />} />
            <Route path="journey-map" element={<JourneyMapPage />} />
            <Route path="momentos-criticos" element={<MomentosCriticosPage />} />
            <Route path="card-sorting" element={<CardSortingPage />} />
            <Route path="evaluacion-heuristica" element={<EvaluacionHeuristicaPage />} />
            <Route path="analitica" element={<AnalyticsPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
