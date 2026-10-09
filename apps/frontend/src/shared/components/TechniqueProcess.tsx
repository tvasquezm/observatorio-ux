import { Icon } from './ui/Icon';

export interface ProcessStep {
  id: string;
  label: string;
  detail?: string;
  done: boolean;
}

interface Props {
  steps: ProcessStep[];
  title?: string;
}

export function TechniqueProcess({ steps, title = 'Proceso de la técnica' }: Props) {
  const done = steps.filter((step) => step.done).length;
  const currentIndex = steps.findIndex((step) => !step.done);

  return (
    <section className="tv-process" aria-label={title}>
      <div className="tv-process-head">
        <span className="kicker">{title}</span>
        <span className="tv-process-count" data-testid="tv-process-count">
          {done} de {steps.length}
        </span>
      </div>
      <ol className="tv-process-steps">
        {steps.map((step, index) => {
          const state = step.done ? 'done' : index === currentIndex ? 'current' : 'todo';
          return (
            <li
              key={step.id}
              className={`tv-step tv-step--${state}`}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span className="tv-step-mark" aria-hidden="true">
                {step.done ? <Icon name="check" size={13} /> : index + 1}
              </span>
              <span className="tv-step-text">
                <strong>{step.label}</strong>
                {step.detail && <small>{step.detail}</small>}
              </span>
              <span className="sr-only">{step.done ? 'Completo' : 'Pendiente'}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
