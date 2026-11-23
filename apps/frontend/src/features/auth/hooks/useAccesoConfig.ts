import { useQuery } from '@tanstack/react-query';
import { getGoogleLoginConfig } from '../api/auth.api';

/**
 * F35: configuración de ingreso que publica el servidor (Google y si acepta
 * contraseña). Comparte caché con el botón de Google. Mientras no llega, o si el
 * servidor es anterior a F35, se asume que la contraseña sigue disponible.
 */
export function useAccesoConfig() {
  const config = useQuery({ queryKey: ['auth', 'google-config'], queryFn: getGoogleLoginConfig, staleTime: 0, refetchOnWindowFocus: false, retry: false });
  return { ...config, conContrasena: config.data?.passwordLogin !== false };
}
