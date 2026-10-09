import { useRef, useState } from 'react';
import { HEURISTICAS_NIELSEN, SEVERIDADES, type SeveridadValor } from '@observatorio-ux/shared-types';
import { EvaluacionHeuristicaApiError } from '../api/evaluacion-heuristica.api';
import { useSubirEvidencia } from '../hooks/useEvaluacionHeuristicaQueries';
import {
  aInput,
  esUrlHttp,
  formVacio,
  severidadInfo,
  validarArchivoEvidencia,
  validarForm,
  type ErroresForm,
  type HallazgoFormValues,
} from '../heuristica-utils';
import type { HallazgoHeuristicaInput } from '../api/evaluacion-heuristica.api';
import { EvidenciaImagen } from './EvidenciaImagen';

interface Props {
  proyectoId: string;
  sesionId: string;
  valores: HallazgoFormValues;
  onChange: (valores: HallazgoFormValues) => void;
  onSubmit: (payload: HallazgoHeuristicaInput) => void;
  onCancel?: () => void;
  guardando: boolean;
  modo: 'crear' | 'editar';
  /** Errores de campo devueltos por el backend (400), por nombre de campo del DTO. */
  erroresServidor?: ErroresForm;
}

export function HallazgoForm({
  proyectoId, sesionId, valores, onChange, onSubmit, onCancel, guardando, modo, erroresServidor,
}: Props) {
  const [errores, setErrores] = useState<ErroresForm>({});
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const { mutate: subir, isPending: subiendo } = useSubirEvidencia(proyectoId);

  const visibles: ErroresForm = { ...erroresServidor, ...errores };
  const heuristica = HEURISTICAS_NIELSEN.find((h) => h.id === valores.heuristicaId);
  const sev = severidadInfo(valores.severidad);

  function set<K extends keyof HallazgoFormValues>(campo: K, valor: HallazgoFormValues[K]) {
    onChange({ ...valores, [campo]: valor });
    if (errores[campo]) setErrores({ ...errores, [campo]: undefined });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const encontrados = validarForm(valores);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    onSubmit(aInput(valores));
  }

  function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    const problema = validarArchivoEvidencia(archivo);
    setErrorArchivo(problema);
    if (problema) return;
    subir(
      { sesionId, archivo },
      {
        onSuccess: (subida) => set('evidenciaArchivoId', subida.id),
        onError: (err) =>
          setErrorArchivo(err instanceof EvaluacionHeuristicaApiError ? err.message : 'No se pudo subir la captura.'),
      },
    );
  }

  const campoError = (campo: keyof HallazgoFormValues) =>
    visibles[campo] ? (
      <span className="hx-error" id={`hx-err-${campo}`} role="alert">{visibles[campo]}</span>
    ) : null;
  const aria = (campo: keyof HallazgoFormValues) =>
    visibles[campo] ? { 'aria-invalid': true, 'aria-describedby': `hx-err-${campo}` } : {};

  return (
    <form onSubmit={handleSubmit} className="hx-form" noValidate aria-label={modo === 'crear' ? 'Nuevo hallazgo' : 'Editar hallazgo'}>
      <div className="form-grid-2">
        <label className="field">
          Heurística vulnerada
          <select
            value={valores.heuristicaId}
            onChange={(e) => set('heuristicaId', e.target.value as HallazgoFormValues['heuristicaId'])}
            className="input-sm"
            {...aria('heuristicaId')}
          >
            <option value="">Selecciona…</option>
            {HEURISTICAS_NIELSEN.map((h) => (
              <option key={h.id} value={h.id}>{h.id} — {h.nombre}</option>
            ))}
          </select>
          {heuristica && <span className="hx-hint">{heuristica.definicion}</span>}
          {campoError('heuristicaId')}
        </label>
        <label className="field">
          Severidad
          <select
            value={valores.severidad}
            onChange={(e) => set('severidad', Number(e.target.value) as SeveridadValor)}
            className="input-sm"
          >
            {SEVERIDADES.map((s) => (
              <option key={s.valor} value={s.valor}>{s.valor} — {s.etiqueta}</option>
            ))}
          </select>
          <span className="hx-hint">{sev.descripcion}</span>
        </label>
      </div>

      <div className="form-grid-2">
        <label className="field">
          Título del hallazgo
          <input
            value={valores.titulo}
            onChange={(e) => set('titulo', e.target.value)}
            placeholder="Ej. Botón principal sin etiqueta"
            maxLength={120}
            className="input-sm"
            {...aria('titulo')}
          />
          {campoError('titulo')}
        </label>
        <label className="field">
          Pantalla o elemento evaluado
          <input
            value={valores.pantalla}
            onChange={(e) => set('pantalla', e.target.value)}
            placeholder="Ej. Formulario de inscripción"
            maxLength={200}
            className="input-sm"
            {...aria('pantalla')}
          />
          {campoError('pantalla')}
        </label>
      </div>

      <label className="field">
        Descripción del problema
        <textarea
          value={valores.descripcion}
          onChange={(e) => set('descripcion', e.target.value)}
          placeholder="¿Qué incumple el principio y cómo dificulta la interacción?"
          maxLength={2000}
          className="textarea-sm"
          {...aria('descripcion')}
        />
        {campoError('descripcion')}
      </label>

      <fieldset className="hx-evidence">
        <legend>Evidencia</legend>
        <label className="field">
          Observación
          <textarea
            value={valores.evidencia}
            onChange={(e) => set('evidencia', e.target.value)}
            placeholder="Dato, observación o referencia que respalda el hallazgo"
            maxLength={1000}
            className="textarea-sm"
            {...aria('evidencia')}
          />
          {campoError('evidencia')}
        </label>
        <div className="form-grid-2">
          <label className="field">
            Enlace (opcional)
            <input
              value={valores.evidenciaUrl}
              onChange={(e) => set('evidenciaUrl', e.target.value)}
              placeholder="https://…"
              inputMode="url"
              className="input-sm"
              {...aria('evidenciaUrl')}
            />
            {campoError('evidenciaUrl')}
          </label>
          <div className="field">
            <span id="hx-captura-label">Captura de pantalla (opcional)</span>
            <div className="row-gap-sm">
              <input
                ref={inputArchivoRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleArchivo}
                className="sr-only"
                aria-labelledby="hx-captura-label"
                tabIndex={-1}
              />
              <button type="button" className="secondary" onClick={() => inputArchivoRef.current?.click()} disabled={subiendo}>
                {subiendo ? 'Subiendo…' : valores.evidenciaArchivoId ? 'Reemplazar captura' : 'Adjuntar captura'}
              </button>
              {valores.evidenciaArchivoId && (
                <button type="button" className="text-button text-button--danger" onClick={() => set('evidenciaArchivoId', null)}>
                  Quitar
                </button>
              )}
            </div>
            <span className="hx-hint">PNG, JPEG o WebP · máx. 2 MB</span>
            {errorArchivo && <span className="hx-error" role="alert">{errorArchivo}</span>}
          </div>
        </div>
        {valores.evidenciaArchivoId && (
          <EvidenciaImagen
            proyectoId={proyectoId}
            sesionId={sesionId}
            evidenciaId={valores.evidenciaArchivoId}
            alt={valores.titulo || 'Captura del hallazgo'}
          />
        )}
        {valores.evidenciaUrl.trim() && esUrlHttp(valores.evidenciaUrl.trim()) && (
          <p className="text-muted-xs">Se guardará el enlace: {valores.evidenciaUrl.trim()}</p>
        )}
      </fieldset>

      <label className="field">
        Recomendación de mejora
        <textarea
          value={valores.recomendacion}
          onChange={(e) => set('recomendacion', e.target.value)}
          placeholder="Propón una acción concreta para corregirlo"
          maxLength={1000}
          className="textarea-sm"
          {...aria('recomendacion')}
        />
        {campoError('recomendacion')}
      </label>

      <div className="row-gap">
        <button type="submit" className="primary" disabled={guardando || subiendo}>
          {guardando ? 'Guardando…' : modo === 'crear' ? '+ Agregar hallazgo' : 'Guardar cambios'}
        </button>
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel} disabled={guardando}>
            Cancelar
          </button>
        )}
        {modo === 'crear' && (
          <button type="button" className="text-button" onClick={() => { onChange(formVacio()); setErrores({}); }} disabled={guardando}>
            Limpiar
          </button>
        )}
      </div>
    </form>
  );
}
