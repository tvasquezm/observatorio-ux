import { useState, type ReactNode } from 'react';
import { InfoTip } from '../../../shared/components/ui/InfoTip';
import { agregarLinea, analizarEntrada, elementosNuevos, existeElemento, quitarElemento } from '../card-sorting-input';
import { CardSortingChips } from './CardSortingChips';

type Mode = 'uno' | 'lista';

interface Props {
  title: string;
  singular: string;
  plural: string;
  value: string;
  onChange: (next: string) => void;
  max: number;
  aviso?: number;
  defaultMode: Mode;
  rules: string[];
  example: string;
  addPlaceholder: string;
  help?: ReactNode;
  helpLabel?: string;
  meta?: ReactNode;
  error?: string;
}

export function CardSortingEntry({
  title, singular, plural, value, onChange, max, aviso, defaultMode, rules, example,
  addPlaceholder, help, helpLabel, meta, error,
}: Props) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [single, setSingle] = useState('');
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const info = analizarEntrada(value, max, aviso);
  const { nuevas, omitidas } = elementosNuevos(value, draft);

  function addOne() {
    const text = single.trim();
    if (!text) return;
    if (existeElemento(value, text)) {
      setNote(`«${text}» ya está en la lista.`);
      return;
    }
    onChange(agregarLinea(value, text));
    setSingle('');
    setNote('');
  }

  function addBlock() {
    if (nuevas.length === 0) return;
    onChange([value.replace(/\s+$/, ''), ...nuevas].filter(Boolean).join('\n'));
    setNote(`${nuevas.length} ${nuevas.length === 1 ? singular : plural} agregada${nuevas.length === 1 ? '' : 's'}.`);
    setDraft('');
  }

  return (
    <div className="cs-field cs-entry">
      <div className="cs-entry-head">
        <span className="cs-entry-title">
          {title}
          {help && <InfoTip label={helpLabel ?? `Ayuda: ${title}`} align="start">{help}</InfoTip>}
        </span>
        <div className="cs-mode-toggle" role="group" aria-label={`Modo de ingreso de ${plural}`}>
          <button type="button" aria-pressed={mode === 'uno'} onClick={() => { setMode('uno'); setNote(''); }}>
            De a una
          </button>
          <button type="button" aria-pressed={mode === 'lista'} onClick={() => { setMode('lista'); setNote(''); }}>
            Pegar lista
          </button>
        </div>
      </div>

      {mode === 'uno' ? (
        <div className="cs-add-one">
          <input
            aria-label={`Agregar ${singular}`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "cs-configuration-error" : undefined}
            placeholder={addPlaceholder}
            value={single}
            onChange={(event) => setSingle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              addOne();
            }}
          />
          <button type="button" className="secondary" onClick={addOne} disabled={!single.trim()}>
            Agregar
          </button>
        </div>
      ) : (
        <div className="cs-paste">
          <ul className="cs-rules">
            {rules.map((rule) => <li key={rule}>{rule}</li>)}
          </ul>
          <textarea
            aria-label={`Pegar lista de ${plural}`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "cs-configuration-error" : undefined}
            placeholder={example}
            value={draft}
            onChange={(event) => { setDraft(event.target.value); setNote(''); }}
            className="textarea-md"
          />
          <div className="cs-paste-bar">
            <small data-testid={`cs-paste-preview-${plural}`}>
              {draft.trim() === ''
                ? 'Una por línea.'
                : `${nuevas.length} por agregar${omitidas > 0 ? ` · ${omitidas} ${omitidas === 1 ? 'repetida se omitirá' : 'repetidas se omitirán'}` : ''}`}
            </small>
            <button type="button" className="secondary" onClick={addBlock} disabled={nuevas.length === 0}>
              {nuevas.length === 0 ? 'Agregar' : `Agregar ${nuevas.length} ${nuevas.length === 1 ? singular : plural}`}
            </button>
          </div>
        </div>
      )}

      {note && <small className="cs-entry-note" role="status">{note}</small>}
      {meta}
      <CardSortingChips
        info={info}
        max={max}
        aviso={aviso}
        noun={plural}
        onRemove={(index) => onChange(quitarElemento(value, index))}
      />
    </div>
  );
}
