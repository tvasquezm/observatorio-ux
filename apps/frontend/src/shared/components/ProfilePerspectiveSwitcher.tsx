import type { EvaluatorRole } from '../../features/auth/api/auth.api';
import {
  canUsePerspective,
  PERSPECTIVE_LABELS,
  PERSPECTIVE_ROLES,
} from '../auth/perspectivas';

interface ProfilePerspectiveSwitcherProps {
  accountRole: EvaluatorRole;
  activeRole: EvaluatorRole;
  onChange: (role: EvaluatorRole) => void;
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19c.45-3.75 2.6-5.75 6.5-5.75s6.05 2 6.5 5.75" />
    </svg>
  );
}

export function ProfilePerspectiveSwitcher({
  accountRole,
  activeRole,
  onChange,
}: ProfilePerspectiveSwitcherProps) {
  return (
    <div className="perspective-switcher">
      <span className="perspective-status" aria-live="polite">
        Viendo como <b>{PERSPECTIVE_LABELS[activeRole]}</b>
      </span>
      <div className="perspective-options" role="group" aria-label="Cambiar perspectiva">
        {PERSPECTIVE_ROLES.map((role) => {
          const allowed = canUsePerspective(accountRole, role);
          const active = role === activeRole;
          const label = PERSPECTIVE_LABELS[role];

          return (
            <button
              key={role}
              type="button"
              className={`perspective-option perspective-${role.toLowerCase()}${active ? ' active' : ''}`}
              aria-label={allowed ? `Ver como ${label}` : `${label}: no disponible para tu cuenta`}
              aria-pressed={active}
              disabled={!allowed}
              title={allowed ? `Cambiar a la perspectiva de ${label}` : 'Tu cuenta no tiene acceso a esta perspectiva'}
              onClick={() => onChange(role)}
            >
              <span className="perspective-avatar"><PersonIcon /></span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
