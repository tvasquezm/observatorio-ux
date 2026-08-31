// apps/frontend/src/App.tsx

import { Routes, Route } from 'react-router-dom';
import { LoginPage } from './features/auth/pages/LoginPage';
import { ProtectedRoute } from './shared/routing/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
