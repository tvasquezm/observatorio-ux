import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getGoogleLoginConfig, loginWithGoogle } from '../api/auth.api';
import { useAuthStore } from '../store/useAuthStore';

type GoogleIdentity = {
  initialize(options: { client_id: string; nonce: string; callback: (response: { credential: string }) => void; auto_select: boolean }): void;
  renderButton(element: HTMLElement, options: { theme: string; size: string; text: string; width: number; locale: string }): void;
};
declare global { interface Window { google?: { accounts: { id: GoogleIdentity } } } }

let googleScript: Promise<void> | null = null;
function loadGoogle() {
  if (window.google?.accounts.id) return Promise.resolve();
  if (!googleScript) googleScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { script.remove(); googleScript = null; reject(new Error('No se pudo cargar Google. Intenta nuevamente.')); };
    document.head.append(script);
  });
  return googleScript;
}

export function GoogleSignIn() {
  const button = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState('');
  const setSession = useAuthStore(state => state.setSession);
  const config = useQuery({ queryKey: ['auth', 'google-config'], queryFn: getGoogleLoginConfig, staleTime: 0, refetchOnWindowFocus: false, retry: false });
  const { mutate, isPending, error } = useMutation({ mutationFn: loginWithGoogle, onSuccess: data => setSession(data.user) });

  useEffect(() => {
    if (!config.data?.enabled) return;
    const { clientId, nonce } = config.data;
    let active = true;
    setLoadError('');
    loadGoogle().then(() => {
      if (!active || !button.current || !window.google) return;
      window.google.accounts.id.initialize({ client_id: clientId, nonce, auto_select: false, callback: result => { if (active) mutate(result.credential); } });
      button.current.replaceChildren();
      window.google.accounts.id.renderButton(button.current, { theme: 'outline', size: 'large', text: 'continue_with', locale: 'es', width: Math.min(340, button.current.clientWidth) });
    }).catch(error => { if (active) setLoadError(error.message); });
    return () => { active = false; };
  }, [config.data, mutate]);

  if (!config.data?.enabled) return null;
  return <section className="google-sign-in" aria-label="Acceso con Google" aria-busy={isPending}>
    <div ref={button} inert={isPending} />
    {isPending && <p role="status">Verificando tu acceso…</p>}
    {(loadError || error) && <p role="alert">{loadError || (error instanceof Error ? error.message : 'No se pudo ingresar.')}</p>}
    {(loadError || error) && <button type="button" className="secondary" onClick={() => config.refetch()}>Reintentar Google</button>}
    <p>Solo cuentas autorizadas por la administración.</p>
  </section>;
}
