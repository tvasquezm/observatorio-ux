import type { EvaluatorRole, EvaluatorUser } from '../../features/auth/api/auth.api';

export const PERSPECTIVE_ROLES: readonly EvaluatorRole[] = ['ESTUDIANTE', 'DOCENTE', 'ADMIN'];

export const PERSPECTIVE_LABELS: Record<EvaluatorRole, string> = {
  ESTUDIANTE: 'Estudiante',
  DOCENTE: 'Docente',
  ADMIN: 'Administrador',
};

const ALLOWED_PERSPECTIVES: Record<EvaluatorRole, EvaluatorRole[]> = {
  ESTUDIANTE: ['ESTUDIANTE'],
  DOCENTE: ['ESTUDIANTE', 'DOCENTE'],
  ADMIN: [...PERSPECTIVE_ROLES],
};

const STORAGE_KEY = 'observatorio-ux-perspective:v1';

interface StoredPerspective {
  userId: string;
  role: EvaluatorRole;
}

export function canUsePerspective(accountRole: EvaluatorRole, perspectiveRole: EvaluatorRole) {
  return ALLOWED_PERSPECTIVES[accountRole]?.includes(perspectiveRole) ?? false;
}

export function isEvaluatorRole(value: unknown): value is EvaluatorRole {
  return typeof value === 'string' && PERSPECTIVE_ROLES.includes(value as EvaluatorRole);
}

export function resolvePerspective(
  accountRole: EvaluatorRole,
  requestedRole: EvaluatorRole | null | undefined,
): EvaluatorRole {
  return requestedRole && canUsePerspective(accountRole, requestedRole)
    ? requestedRole
    : accountRole;
}

export function readStoredPerspective(user: EvaluatorUser, storage: Storage): EvaluatorRole {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return user.rol;

    const stored = JSON.parse(raw) as StoredPerspective;
    if (stored.userId !== user.id || !canUsePerspective(user.rol, stored.role)) {
      return user.rol;
    }
    return stored.role;
  } catch {
    return user.rol;
  }
}

export function storePerspective(user: EvaluatorUser, role: EvaluatorRole, storage: Storage) {
  if (!canUsePerspective(user.rol, role)) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ userId: user.id, role } satisfies StoredPerspective));
  } catch {
    // La perspectiva sigue funcionando aunque el navegador bloquee storage.
  }
}

export function clearStoredPerspective(storage: Storage) {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Nada más que limpiar si el navegador bloquea storage.
  }
}

export function canViewSalas(role: EvaluatorRole) {
  return role !== 'ESTUDIANTE';
}

export function canViewAnalytics(role: EvaluatorRole) {
  return role !== 'ESTUDIANTE';
}
