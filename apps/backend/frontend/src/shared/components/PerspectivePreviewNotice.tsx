import type { EvaluatorRole } from '../../features/auth/api/auth.api';
import { PERSPECTIVE_LABELS } from '../auth/perspectivas';

interface PerspectivePreviewNoticeProps {
  accountRole: EvaluatorRole;
  activeRole: EvaluatorRole;
  onRestore: () => void;
}

export function PerspectivePreviewNotice({
  accountRole,
  activeRole,
  onRestore,
}: PerspectivePreviewNoticeProps) {
  if (accountRole === activeRole) {
    return null;
  }

  const accountLabel = PERSPECTIVE_LABELS[accountRole];
  const activeLabel = PERSPECTIVE_LABELS[activeRole];

  return (
    <section className="perspective-preview" aria-label="Vista previa de perspectiva">
      <span className="perspective-preview-dot" aria-hidden="true" />
      <div className="perspective-preview-copy" role="status">
        <strong>Vista previa: {activeLabel}</strong>
        <span>Tu cuenta sigue siendo {accountLabel}.</span>
      </div>
      <button type="button" onClick={onRestore}>
        Volver a {accountLabel}
      </button>
    </section>
  );
}
