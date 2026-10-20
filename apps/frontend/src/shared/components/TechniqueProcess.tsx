import { useEffect, useId, useRef, useState } from 'react';
import type { FocusEvent } from 'react';
import { AnilloAvance } from './AnilloAvance';
import { Icon } from './ui/Icon';

export interface ProcessStep {
  id: string;
  label: string;
  detail?: string;
  done: boolean;
  /** La técnica puede quedar lista sin esta fase. */
  opcional?: boolean;
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
  const obligatorios = steps.filter((step) => !step.opcional);
  const hechos = obligatorios.filter((step) => step.done).length;
  const currentIndex = steps.findIndex((step) => !step.done);
  const listo = steps.length > 0 && hechos === obligatorios.length;
  const faltantes = steps.filter((step) => step.opcional && !step.done);

  const actual = currentIndex >= 0 ? steps[currentIndex] : null;

  return (
    <section
      className={`tv-process${compact ? ' tv-process--compact' : ''}${listo ? ' tv-process--listo' : ''}`}
      aria-label={title}
    >
      <div className="tv-process-head">
        <AnilloAvance hecho={hechos} total={obligatorios.length} tamano={compact ? 44 : 56} />
        <div className="tv-process-titulo">
          <span className="kicker">{title}</span>
          {actual && (
            <div key={actual.id} className="tv-process-fase">
              <p className="tv-process-fase-n">
                Fase {currentIndex + 1} de {steps.length}
                {actual.opcional && <span className="tv-process-opcional">Opcional</span>}
              </p>
              <strong className="tv-process-fase-nombre">{actual.label}</strong>
              {actual.detail && <small className="tv-process-fase-detalle">{actual.detail}</small>}
              {actual.opcional && (
                <small className="tv-process-fase-detalle">Puedes cerrar la técnica sin esta fase.</small>
              )}
            </div>
          )}
          <div className="tv-process-fila">
            <p className="tv-process-estado" role="status">
              {listo && (
                <>
                  <Icon name="check" size={14} /> {textoListo}
                </>
              )}
            </p>
            {listo && faltantes.length > 0 && <FasesFaltantes faltantes={faltantes} />}
          </div>
        </div>
      </div>
      <ol className="tv-process-steps sr-only">
        {steps.map((step, index) => {
          const state = step.done ? 'done' : index === currentIndex ? 'current' : 'todo';
          return (
            <li key={step.id} aria-current={state === 'current' ? 'step' : undefined}>
              {step.label}
              {step.opcional ? ' (opcional)' : ''}
              {step.detail ? `: ${step.detail}` : ''}. {step.done ? 'Completo' : 'Pendiente'}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function FasesFaltantes({ faltantes }: { faltantes: ProcessStep[] }) {
  const id = useId();
  const raiz = useRef<HTMLSpanElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [encima, setEncima] = useState(false);
  const [foco, setFoco] = useState(false);
  const visible = abierto || encima || foco;

  useEffect(() => {
    if (!visible) return;
    const cerrar = () => {
      setAbierto(false);
      setEncima(false);
      setFoco(false);
    };
    const teclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
    };
    const fuera = (e: Event) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) cerrar();
    };
    document.addEventListener('keydown', teclado);
    document.addEventListener('pointerdown', fuera);
    return () => {
      document.removeEventListener('keydown', teclado);
      document.removeEventListener('pointerdown', fuera);
    };
  }, [visible]);

  function alternar() {
    if (visible) {
      setAbierto(false);
      setEncima(false);
      setFoco(false);
    } else setAbierto(true);
  }
  function alEnfocar(e: FocusEvent<HTMLButtonElement>) {
    try {
      if (e.currentTarget.matches(':focus-visible')) setFoco(true);
    } catch {
      /* sin soporte de :focus-visible: solo se abre con clic o toque */
    }
  }

  return (
    <span
      ref={raiz}
      className="tv-faltan"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setEncima(true)}
      onPointerLeave={() => setEncima(false)}
    >
      <button
        type="button"
        className="tv-faltan-boton"
        aria-expanded={visible}
        aria-controls={id}
        aria-label={`Faltan ${faltantes.length} ${faltantes.length === 1 ? 'fase opcional' : 'fases opcionales'}`}
        onClick={alternar}
        onFocus={alEnfocar}
        onBlur={() => setFoco(false)}
      >
        <Icon name="info" size={16} />
      </button>
      {visible && (
        <div id={id} className="tv-faltan-cuadro">
          <strong>Fases opcionales que faltan</strong>
          <ul>
            {faltantes.map((fase) => (
              <li key={fase.id}>
                <span>{fase.label}</span>
                {fase.detail && <small>{fase.detail}</small>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}
