// apps/frontend/src/features/auth/hooks/useAuthMutations.ts

import { useMutation } from '@tanstack/react-query';
import { login, AuthApiError } from '../api/auth.api';
import { useAuthStore } from '../store/useAuthStore';
import { notify } from '../../../shared/api/toast';

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: (data) => {
      setSession(data.access_token, data.user);
      notify.success(`Bienvenido, ${data.user.nombre}`);
    },
    onError: (err) => {
      if (err instanceof AuthApiError) notify.error(err.message);
      else notify.error('Ocurrió un error al iniciar sesión.');
    },
  });
}
