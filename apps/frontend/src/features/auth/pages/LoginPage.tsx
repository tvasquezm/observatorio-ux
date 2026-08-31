// apps/frontend/src/features/auth/pages/LoginPage.tsx

import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useLogin } from '../hooks/useAuthMutations';
import { useAuthStore } from '../store/useAuthStore';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { mutate, isPending } = useLogin();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) return <Navigate to="/" replace />;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate({ email, password });
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <form
        onSubmit={handleSubmit}
        style={{ width: 320, display: 'grid', gap: 12, padding: 24, border: '1px solid #ddd', borderRadius: 12 }}
      >
        <h1 style={{ margin: 0, fontSize: 20 }}>UX Observatory</h1>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
        <button type="submit" disabled={isPending} style={{ padding: 10, cursor: 'pointer' }}>
          {isPending ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
