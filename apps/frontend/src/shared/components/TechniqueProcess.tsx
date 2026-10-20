import { AnilloAvance } from './AnilloAvance';
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
  compact?: boolean;
  textoListo?: string;
}

export function TechniqueProcess({
  steps,
  title = 'Proceso de la técnica',
  compact = false,
  textoListo = 'Técnica completa y lista para usar',
}: Props) {
  const done = steps.filter((step) => step.done).length;
  const currentIndex = steps.findIndex((step) => !step.done);
  const listo = steps.length > 0 && done === steps.length;

  return (
    <section
      className={`tv-process${compact ? ' tv-process--compact' : ''}${listo ? ' tv-process--listo' : ''}`}
      aria-label={title}
    >
      <div className="tv-process-head">
        <AnilloAvance hecho={done} total={steps.length} tamano={compact ? 44 : 56} />
        <div className="tv-process-titulo">
          <span className="kicker">{title}</span>
          {currentIndex >= 0 && (
            <p className="tv-process-ahora">
              Ahora: <strong>{steps[currentIndex].label}</strong>
            </p>
          )}
          <p className="tv-process-estado" role="status">
            {listo && (
              <>
                <Icon name="check" size={14} /> {textoListo}
              </>
            )}
          </p>
        </div>
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
