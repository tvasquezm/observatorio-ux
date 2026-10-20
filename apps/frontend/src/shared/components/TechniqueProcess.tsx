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

  const actual = currentIndex >= 0 ? steps[currentIndex] : null;

  return (
    <section
      className={`tv-process${compact ? ' tv-process--compact' : ''}${listo ? ' tv-process--listo' : ''}`}
      aria-label={title}
    >
      <div className="tv-process-head">
        <AnilloAvance hecho={done} total={steps.length} tamano={compact ? 44 : 56} />
        <div className="tv-process-titulo">
          <span className="kicker">{title}</span>
          {actual && (
            <div key={actual.id} className="tv-process-fase">
              <p className="tv-process-fase-n">
                Fase {currentIndex + 1} de {steps.length}
              </p>
              <strong className="tv-process-fase-nombre">{actual.label}</strong>
              {actual.detail && <small className="tv-process-fase-detalle">{actual.detail}</small>}
            </div>
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
      <ol className="tv-process-steps sr-only">
        {steps.map((step, index) => {
          const state = step.done ? 'done' : index === currentIndex ? 'current' : 'todo';
          return (
            <li key={step.id} aria-current={state === 'current' ? 'step' : undefined}>
              {step.label}
              {step.detail ? `: ${step.detail}` : ''}. {step.done ? 'Completo' : 'Pendiente'}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
