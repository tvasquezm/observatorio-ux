// apps/frontend/src/features/auth/pages/LoginPage.tsx

import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useLogin } from '../hooks/useAuthMutations';
import { useAuthStore } from '../store/useAuthStore';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

// Navegación real (no fetch): el flujo OAuth necesita que el navegador
// vaya a Google y vuelva; el backend setea las mismas cookies httpOnly
// que el login por password y redirige a '/' — checkSession() ya
// existente en useAuthStore detecta la sesión al montar la app de vuelta.
function loginWithGoogle() {
  window.location.href = `${API_BASE}/auth/google`;
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { mutate, isPending, error } = useLogin();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) return <Navigate to="/" replace />;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate({ email, password });
  }

  return (
    <div className="login">
      <section className="login-card">
        <img
          className="login-logo"
          src="/brand/uxlab-observatorio.png"
          alt="UXLab Observatorio · Experiencia usuaria"
        />
        <h1>Ingresá a tu cuenta</h1>
        <p>Accedé para gestionar tus proyectos de investigación UX.</p>

        <form onSubmit={handleSubmit}>
          <label className="field">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="nombre@utem.cl"
            />
          </label>
          <label className="field">
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
            />
          </label>

          {error && <p className="login-error">{(error as Error).message}</p>}

          <button type="submit" className="primary login-submit" disabled={isPending}>
            {isPending ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <div className="login-divider">o</div>

        <button
          type="button"
          className="login-google-btn"
          onClick={loginWithGoogle}
        >
          Ingresar con Google
        </button>

        <small className="login-note">Plataforma de investigación UX · uso académico</small>
      </section>

      <aside className="login-art">
        <div className="orbit" />
        <div className="orbit two" />
        <div>
          <img
            className="login-art-logo"
            src="/brand/uxlab-observatorio-white.png"
            alt="UXLab Observatorio"
          />
          <strong>Diseñá con evidencia.</strong>
          <p>
            Personas, journey maps, momentos críticos, card sorting y evaluación
            heurística — todo en un solo lugar de trabajo.
          </p>
        </div>
      </aside>
    </div>
  );
}
