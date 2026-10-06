// apps/frontend/src/features/auth/pages/LoginPage.tsx

import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useLogin } from '../hooks/useAuthMutations';
import { useAuthStore } from '../store/useAuthStore';

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
      <main className="login-card">
        <img
          className="login-logo"
          src="/brand/uxlab-observatorio.webp"
          alt="UXLab Observatorio · Experiencia usuaria"
          width="1760"
          height="440"
          {...{ fetchpriority: 'high' }}
        />
        <h1>Ingresa a tu cuenta</h1>
        <p>Accede para gestionar tus proyectos de investigación UX.</p>

        <form onSubmit={handleSubmit}>
          <label className="field">
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
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
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
            />
          </label>

          {error && <p className="login-error" role="alert">{(error as Error).message}</p>}

          <button type="submit" className="primary login-submit" disabled={isPending}>
            {isPending ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <details className="login-help">
          <summary>¿Olvidaste tu contraseña o no puedes ingresar?</summary>
          <p>Solicita a tu docente o a la persona administradora de la plataforma que restablezca tu acceso.</p>
        </details>

        <small className="login-note">Plataforma de investigación UX · uso académico</small>
      </main>

      <aside className="login-art">
        <div className="orbit" />
        <div className="orbit two" />
        <div>
          <img
            className="login-art-logo"
            src="/brand/uxlab-observatorio-white.webp"
            alt="UXLab Observatorio"
            width="1760"
            height="440"
            decoding="async"
          />
          <strong>Diseña con evidencia.</strong>
          <p>
            Personas, journey maps, momentos críticos, card sorting y evaluación
            heurística — todo en un solo lugar de trabajo.
          </p>
        </div>
      </aside>
    </div>
  );
}
