import { Icon } from '../../../shared/components/ui/Icon';

export interface ProgressStep {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  optional?: boolean;
}

interface Props {
  steps: ProgressStep[];
  problem: string | null;
}

export function CardSortingProgress({ steps, problem }: Props) {
  const required = steps.filter((step) => !step.optional);
  const done = required.filter((step) => step.done).length;
  const percent = required.length === 0 ? 0 : Math.round((done / required.length) * 100);
  const ready = problem === null;

  return (
    <aside className={`panel cs-progress${ready ? ' ready' : ''}`} aria-label="Avance del estudio">
      <div className="cs-progress-head">
        <h2>Tu estudio</h2>
        <span data-testid="cs-progress-count">{done} de {required.length}</span>
      </div>
      <div
        className="cs-progress-bar"
        role="progressbar"
        aria-label="Avance del estudio"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <i style={{ width: `${percent}%` }} />
      </div>
      <ol className="cs-progress-steps">
        {steps.map((step) => (
          <li key={step.id} className={step.done ? 'done' : step.optional ? 'optional' : ''}>
            <span className="cs-progress-mark" aria-hidden="true">
              {step.done ? <Icon name="check" size={12} /> : null}
            </span>
            <span className="cs-progress-text">
              <strong>{step.label}{step.optional ? ' (opcional)' : ''}</strong>
              <small>{step.detail}</small>
            </span>
            <span className="sr-only">{step.done ? 'Completo' : step.optional ? 'Opcional' : 'Pendiente'}</span>
          </li>
        ))}
      </ol>
      <p className="cs-progress-status" role="status" data-testid="cs-progress-status">
        {ready ? 'Listo para crear.' : problem}
      </p>
    </aside>
  );
}
