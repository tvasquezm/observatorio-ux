import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import {
  useCreateCriticalMoment,
  useUpdateCriticalMoment,
  useDeleteCriticalMoment,
  useCriticalMoments,
  useLockCriticalMoment,
  useUnlockCriticalMoment,
} from '../features/momentos-criticos/hooks/useMomentosCriticosQueries';
import {
  addIncidente,
  removeIncidente,
  type IncidenteCritico,
  type MomentosCriticosContenido,
  type MomentosCriticosArtifact,
} from '../features/momentos-criticos/api/momentos-criticos.api';
import { ArtifactsApiError } from '../shared/api/artifacts.api';
import { notify } from '../shared/api/toast';
import { useConfirm } from '../shared/api/confirm';

const MIN_INCIDENTES = 1; // MomentosCriticosSchema exige mínimo 1

function incidenteVacio(): IncidenteCritico {
  return {
    nombre: '',
    descripcion: '',
    tipo: 'Negativo',
    impacto: 'Medio',
    frecuencia: 'Media',
    causa: '',
    accionesSugeridas: [],
  };
}

function contenidoVacio(): MomentosCriticosContenido {
  return {
    perfilUsuario: { id: crypto.randomUUID(), nombre: '', rol: '' },
    incidentes: [incidenteVacio()],
  };
}

export function MomentosCriticosPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const { data: momentos, isLoading, isError: isListError, error: listError } = useCriticalMoments(proyectoId);
  const { mutate: crear, isPending: isCreating, error: createError } = useCreateCriticalMoment(proyectoId);
  const { mutate: actualizar, isPending: isUpdating, error: updateError } = useUpdateCriticalMoment(proyectoId);
  const { mutate: eliminar, error: deleteError } = useDeleteCriticalMoment(proyectoId);
  const { mutate: lockCriticalMoment } = useLockCriticalMoment(proyectoId);
  const { mutate: unlockCriticalMoment } = useUnlockCriticalMoment(proyectoId);
  const confirm = useConfirm();
  const error = listError ?? createError ?? updateError ?? deleteError;

  const [form, setForm] = useState<MomentosCriticosContenido>(contenidoVacio());
  // Un input de "acciones sugeridas" por incidente, mismo índice que
  // form.incidentes — se mantienen en paralelo porque en el form ese campo
  // se edita como texto separado por coma, no como array directo.
  const [accionesInputs, setAccionesInputs] = useState<string[]>(['']);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [vistaMatriz, setVistaMatriz] = useState(false);
  const [editandoArtefactoId, setEditandoArtefactoId] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  function resetForm() {
    if (editandoArtefactoId) unlockCriticalMoment(editandoArtefactoId);
    setForm(contenidoVacio());
    setAccionesInputs(['']);
    setEditandoArtefactoId(null);
    setMostrarForm(false);
    setReadOnly(false);
  }

  function handleStartEdit(m: MomentosCriticosArtifact) {
    const artefactoId = m.artefactoLogicoId || m.id;
    setEditandoArtefactoId(artefactoId);
    setForm(m.contenido);
    setAccionesInputs(
      m.contenido.incidentes.map((inc) => (inc.accionesSugeridas ? inc.accionesSugeridas.join(', ') : '')),
    );
    setMostrarForm(true);
    setReadOnly(false);

    lockCriticalMoment(
      { artefactoId },
      {
        onError: (err) => {
          const msg = err instanceof ArtifactsApiError && err.status === 409
            ? 'Otro usuario está editando este momento crítico ahora mismo.'
            : 'No se pudo bloquear el momento crítico para editar.';
          notify.error(msg);
          setReadOnly(true);
        },
      },
    );
  }

  function actualizarIncidente(index: number, campo: keyof IncidenteCritico, valor: string) {
    if (campo === 'accionesSugeridas') {
      const siguiente = [...accionesInputs];
      siguiente[index] = valor;
      setAccionesInputs(siguiente);
      return;
    }
    const incidentes = [...form.incidentes];
    incidentes[index] = { ...incidentes[index], [campo]: valor };
    setForm({ ...form, incidentes });
  }

  function handleAgregarIncidente() {
    setForm(addIncidente(form, incidenteVacio()));
    setAccionesInputs([...accionesInputs, '']);
  }

  function handleQuitarIncidente(index: number) {
    if (form.incidentes.length <= MIN_INCIDENTES) return;
    setForm(removeIncidente(form, index));
    setAccionesInputs(accionesInputs.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const perfilValido = form.perfilUsuario.nombre.trim();
    const incidentesValidos = form.incidentes.every((inc) => inc.nombre.trim());
    if (!perfilValido || !incidentesValidos) return;

    const incidentesFinal: IncidenteCritico[] = form.incidentes.map((inc, i) => ({
      ...inc,
      accionesSugeridas: (accionesInputs[i] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
    }));

    const payload: MomentosCriticosContenido = {
      ...form,
      incidentes: incidentesFinal,
    };

    if (editandoArtefactoId) {
      const idAEditar = editandoArtefactoId;
      actualizar(
        { artefactoId: idAEditar, contenido: payload },
        {
          onSuccess: resetForm,
        }
      );
    } else {
      crear(payload, { onSuccess: resetForm });
    }
  }

  const isSaving = isCreating || isUpdating;

  const todosLosIncidentes = momentos?.flatMap((m: MomentosCriticosArtifact) =>
    m.contenido.incidentes.map((inc: IncidenteCritico) => ({
      ...inc,
      artefactoLogicoId: m.artefactoLogicoId,
      perfilNombre: m.contenido.perfilUsuario.nombre,
    }))
  ) || [];

  const nivelesFrecuencia = ['Alta', 'Media', 'Baja'] as const;
  const nivelesImpacto = ['Alto', 'Medio', 'Bajo'] as const;

  return (
    <div className="artifact-page">
      <div className="page-head"><div><span className="eyebrow">TÉCNICA DE INVESTIGACIÓN</span><h1>Momentos críticos</h1><p>Prioriza los incidentes que más afectan la experiencia de tus usuarios.</p></div><span className="status-pill">Matriz de impacto</span></div>
    <div className="panel">
      <div className="panel-head">
        <h2>Momentos Críticos</h2>
        <div className="row-gap">
          <button className="secondary" type="button" onClick={() => setVistaMatriz((v: boolean) => !v)}>
            {vistaMatriz ? 'Ver Lista' : 'Ver Matriz 3x3'}
          </button>
          <button
            className="primary"
            type="button"
            onClick={() => {
              if (mostrarForm) {
                resetForm();
              } else {
                setMostrarForm(true);
              }
            }}
          >
            {mostrarForm ? 'Cancelar' : '+ Nuevo momento crítico'}
          </button>
        </div>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="entity-card form">
          <h3>{editandoArtefactoId ? 'Editar Momento Crítico' : 'Nuevo Momento Crítico'}</h3>
          {readOnly && (
            <p className="error-text">
              Este momento crítico está bloqueado por otro usuario. No puedes editarlo en este momento.
            </p>
          )}
          <fieldset disabled={readOnly} className="readonly-fieldset">
          <div className="form-grid-2">
            <input
              placeholder="Nombre del perfil de usuario *"
              aria-label="Nombre del perfil de usuario"
              value={form.perfilUsuario.nombre}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, perfilUsuario: { ...form.perfilUsuario, nombre: e.target.value } })}
              required
              className="input-sm"
            />
            <input
              placeholder="Rol"
              aria-label="Rol"
              value={form.perfilUsuario.rol}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, perfilUsuario: { ...form.perfilUsuario, rol: e.target.value } })}
              className="input-sm"
            />
          </div>

          <small className="text-muted">Incidentes (mínimo {MIN_INCIDENTES}):</small>
          {form.incidentes.map((incidente, i) => (
            <div key={i} className="mini-card">
              <div className="row-between">
                <small className="text-muted">Incidente {i + 1}</small>
                <button
                  type="button"
                  onClick={() => handleQuitarIncidente(i)}
                  disabled={form.incidentes.length <= MIN_INCIDENTES}
                  title={form.incidentes.length <= MIN_INCIDENTES ? `Debes conservar al menos ${MIN_INCIDENTES} incidente(s)` : 'Quitar incidente'}
                  className="link-btn link-btn--warn"
                >
                  Quitar incidente
                </button>
              </div>
              <input
                placeholder="Nombre del incidente *"
                aria-label={`Nombre del incidente ${i + 1}`}
                value={incidente.nombre}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => actualizarIncidente(i, 'nombre', e.target.value)}
                required
                className="input-sm"
              />
              <textarea
                placeholder="Descripción"
                aria-label={`Descripción incidente ${i + 1}`}
                value={incidente.descripcion}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => actualizarIncidente(i, 'descripcion', e.target.value)}
                className="textarea-desc"
              />
              <div className="form-grid-3">
                <select aria-label={`Tipo incidente ${i + 1}`} value={incidente.tipo} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => actualizarIncidente(i, 'tipo', e.target.value)} className="input-sm">
                  <option value="Positivo">Positivo</option>
                  <option value="Negativo">Negativo</option>
                </select>
                <select aria-label={`Impacto incidente ${i + 1}`} value={incidente.impacto} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => actualizarIncidente(i, 'impacto', e.target.value)} className="input-sm">
                  <option value="Alto">Impacto Alto</option>
                  <option value="Medio">Impacto Medio</option>
                  <option value="Bajo">Impacto Bajo</option>
                </select>
                <select aria-label={`Frecuencia incidente ${i + 1}`} value={incidente.frecuencia} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => actualizarIncidente(i, 'frecuencia', e.target.value)} className="input-sm">
                  <option value="Alta">Frecuencia Alta</option>
                  <option value="Media">Frecuencia Media</option>
                  <option value="Baja">Frecuencia Baja</option>
                </select>
              </div>
              <input
                placeholder="Causa"
                aria-label={`Causa incidente ${i + 1}`}
                value={incidente.causa}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => actualizarIncidente(i, 'causa', e.target.value)}
                className="input-sm"
              />
              <input
                placeholder="Acciones sugeridas (separadas por coma)"
                aria-label={`Acciones sugeridas incidente ${i + 1}`}
                value={accionesInputs[i] ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => actualizarIncidente(i, 'accionesSugeridas', e.target.value)}
                className="input-sm"
              />
            </div>
          ))}

          <button
            type="button"
            className="secondary btn-start"
            onClick={handleAgregarIncidente}
          >
            + Agregar incidente
          </button>

          <button type="submit" className="primary btn-start" disabled={isSaving}>
            {isSaving ? 'Guardando…' : editandoArtefactoId ? 'Actualizar momento crítico' : 'Guardar momento crítico'}
          </button>
          </fieldset>
        </form>
      )}

      {isLoading && <p>Cargando…</p>}
      {error && (
        <p className="error-text">
          {isListError ? 'No se pudo cargar los momentos críticos. ' : ''}
          {(error as Error).message}
        </p>
      )}

      {vistaMatriz && !isLoading && (
        <div className="matrix-wrap">
          <div className="matrix-grid">
            <div className="matrix-corner">Frec. \ Imp.</div>
            <div className="matrix-cell-head">Impacto Alto</div>
            <div className="matrix-cell-head">Impacto Medio</div>
            <div className="matrix-cell-head">Impacto Bajo</div>

            {nivelesFrecuencia.map((frec) => (
              <React.Fragment key={frec}>
                <div className="matrix-cell-head matrix-cell-head--center">
                  Frec. {frec}
                </div>
                {nivelesImpacto.map((imp) => {
                  const filtrados = todosLosIncidentes.filter(
                    (inc) => inc.impacto === imp && inc.frecuencia === frec
                  );
                  const esCritico = imp === 'Alto' && frec === 'Alta';

                  return (
                    <div
                      key={`${frec}-${imp}`}
                      data-testid={`celda-${imp}-${frec}`}
                      className={`matrix-cell${esCritico ? ' matrix-cell--critical' : ''}`}
                    >
                      {filtrados.map((inc, idx: number) => (
                        <div key={idx} className="matrix-incident">
                          <strong className="block">{inc.nombre}</strong>
                          <span className="text-muted-xs">{inc.perfilNombre}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {!vistaMatriz && (
        <div className="list-stack">
          {momentos?.map((m: MomentosCriticosArtifact) => (
            <div key={m.id} className="entity-card">
              <div className="row-between">
                <b>{m.contenido.perfilUsuario.nombre}</b>
                <div className="row-gap-md">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(m)}
                    className="link-btn link-btn--edit"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (await confirm('¿Estás seguro de eliminar este momento crítico?')) {
                        eliminar(m.id);
                      }
                    }}
                    className="link-btn link-btn--delete"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              <small className="text-muted">{m.contenido.incidentes.length} incidente(s)</small>
            </div>
          ))}
          {momentos && momentos.length === 0 && <p>No hay momentos críticos todavía.</p>}
        </div>
      )}
    </div></div>
  );
}
