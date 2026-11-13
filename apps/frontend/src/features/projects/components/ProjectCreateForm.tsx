import { OptionalTag } from '../../../shared/components/OptionalTag';
import type { FormEvent } from 'react';
import type { Sala } from '../../salas/api/salas.api';

export interface ProjectCreateValues {
  nombre: string;
  descripcion: string;
  salaId: string;
}

interface Props {
  value: ProjectCreateValues;
  onChange: (value: ProjectCreateValues) => void;
  salas: Sala[];
  salaFija?: Sala;
  isPending: boolean;
  error?: string;
  validationError?: string;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}

export function ProjectCreateForm({ value, onChange, salas, salaFija, isPending, error, validationError, onSubmit, onCancel }: Props) {
  return <form id="crear-proyecto" onSubmit={onSubmit} className="create-project panel">
    <div><span className="eyebrow">DATOS BÁSICOS</span><h2>Crear proyecto</h2></div>
    <div className="project-form-fields">
      <div className="field">
        <label htmlFor="nuevo-proyecto-nombre">Nombre del proyecto</label>
        <input id="nuevo-proyecto-nombre" placeholder="Ej.: Investigación sobre matrícula" value={value.nombre}
          onChange={e => onChange({ ...value, nombre: e.target.value })} required pattern=".*\S.*" autoFocus
          className="text-input" aria-invalid={Boolean(validationError)} aria-describedby={validationError ? 'project-name-error' : undefined} />
        {validationError && <p id="project-name-error" role="alert" className="error-text">{validationError}</p>}
      </div>
      <div className="field">
        <label htmlFor="nuevo-proyecto-descripcion">Descripción del proyecto<OptionalTag /></label>
        <input id="nuevo-proyecto-descripcion" placeholder="Objetivo de la investigación" value={value.descripcion}
          onChange={e => onChange({ ...value, descripcion: e.target.value })} className="text-input" />
      </div>
      <div className="field">
        <label htmlFor="nuevo-proyecto-sala">Sala</label>
        {salaFija ? <input id="nuevo-proyecto-sala" value={salaFija.nombre} readOnly className="text-input" /> :
          <select id="nuevo-proyecto-sala" value={value.salaId} onChange={e => onChange({ ...value, salaId: e.target.value })} required className="text-input">
            <option value="">Selecciona una sala…</option>
            {salas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>}
      </div>
      <div className="form-actions project-create-actions">
        <button type="button" className="secondary" disabled={isPending} onClick={onCancel}>Cancelar</button>
        <button type="submit" className="primary" disabled={isPending || (!salaFija && salas.length === 0)}>{isPending ? 'Creando…' : 'Crear'}</button>
      </div>
    </div>
    {error && <p role="alert" className="error-text">{error} Revisa los datos y vuelve a intentarlo; tu borrador se conserva.</p>}
  </form>;
}
