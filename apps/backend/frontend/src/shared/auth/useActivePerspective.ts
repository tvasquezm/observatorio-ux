import { useAuthStore } from '../../features/auth/store/useAuthStore';
import { resolvePerspective } from './perspectivas';

export function useActivePerspective() {
  const user = useAuthStore((state) => state.user);
  const perspectiveRole = useAuthStore((state) => state.perspectiveRole);
  return user ? resolvePerspective(user.rol, perspectiveRole) : null;
}
