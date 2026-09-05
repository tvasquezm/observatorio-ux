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
      <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Momentos Críticos</h2>
        <div style={{ display: 'flex', gap: 8 }}>
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
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8, margin: '12px 0', padding: 12, border: '1px solid var(--line)', borderRadius: 8 }}>
          <h3>{editandoArtefactoId ? 'Editar Momento Crítico' : 'Nuevo Momento Crítico'}</h3>
          {readOnly && (
            <p style={{ color: 'var(--coral)' }}>
              Este momento crítico está bloqueado por otro usuario. No puedes editarlo en este momento.
            </p>
          )}
          <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, display: 'contents' }}>
          <div className="form-grid-2">
            <input
              placeholder="Nombre del perfil de usuario *"
              aria-label="Nombre del perfil de usuario"
              value={form.perfilUsuario.nombre}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, perfilUsuario: { ...form.perfilUsuario, nombre: e.target.value } })}
              required
              style={{ padding: 8 }}
            />
            <input
              placeholder="Rol"
              aria-label="Rol"
              value={form.perfilUsuario.rol}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, perfilUsuario: { ...form.perfilUsuario, rol: e.target.value } })}
              style={{ padding: 8 }}
            />
          </div>

          <small style={{ color: 'var(--muted)' }}>Incidentes (mínimo {MIN_INCIDENTES}):</small>
          {form.incidentes.map((incidente, i) => (
            <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 6, padding: 8, display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <small style={{ color: 'var(--muted)' }}>Incidente {i + 1}</small>
                <button
                  type="button"
                  onClick={() => handleQuitarIncidente(i)}
                  disabled={form.incidentes.length <= MIN_INCIDENTES}
                  title={form.incidentes.length <= MIN_INCIDENTES ? `Debes conservar al menos ${MIN_INCIDENTES} incidente(s)` : 'Quitar incidente'}
                  style={{
                    cursor: form.incidentes.length <= MIN_INCIDENTES ? 'not-allowed' : 'pointer',
                    color: form.incidentes.length <= MIN_INCIDENTES ? 'var(--muted)' : 'var(--coral)',
                    background: 'none',
                    border: 0,
                    fontSize: 11,
                  }}
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
                style={{ padding: 8 }}
              />
              <textarea
                placeholder="Descripción"
                aria-label={`Descripción incidente ${i + 1}`}
                value={incidente.descripcion}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => actualizarIncidente(i, 'descripcion', e.target.value)}
                style={{ padding: 8, minHeight: 50 }}
              />
              <div className="form-grid-3">
                <select aria-label={`Tipo incidente ${i + 1}`} value={incidente.tipo} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => actualizarIncidente(i, 'tipo', e.target.value)} style={{ padding: 8 }}>
                  <option value="Positivo">Positivo</option>
                  <option value="Negativo">Negativo</option>
                </select>
                <select aria-label={`Impacto incidente ${i + 1}`} value={incidente.impacto} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => actualizarIncidente(i, 'impacto', e.target.value)} style={{ padding: 8 }}>
                  <option value="Alto">Impacto Alto</option>
                  <option value="Medio">Impacto Medio</option>
                  <option value="Bajo">Impacto Bajo</option>
                </select>
                <select aria-label={`Frecuencia incidente ${i + 1}`} value={incidente.frecuencia} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => actualizarIncidente(i, 'frecuencia', e.target.value)} style={{ padding: 8 }}>
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
                style={{ padding: 8 }}
              />
              <input
                placeholder="Acciones sugeridas (separadas por coma)"
                aria-label={`Acciones sugeridas incidente ${i + 1}`}
                value={accionesInputs[i] ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => actualizarIncidente(i, 'accionesSugeridas', e.target.value)}
                style={{ padding: 8 }}
              />
            </div>
          ))}

          <button
            type="button"
            className="secondary"
            onClick={handleAgregarIncidente}
            style={{ justifySelf: 'start' }}
          >
            + Agregar incidente
          </button>

          <button type="submit" className="primary" disabled={isSaving} style={{ justifySelf: 'start' }}>
            {isSaving ? 'Guardando…' : editandoArtefactoId ? 'Actualizar momento crítico' : 'Guardar momento crítico'}
          </button>
          </fieldset>
        </form>
      )}

      {isLoading && <p>Cargando…</p>}
      {error && (
        <p style={{ color: 'var(--coral)' }}>
          {isListError ? 'No se pudo cargar los momentos críticos. ' : ''}
          {(error as Error).message}
        </p>
      )}

      {vistaMatriz && !isLoading && (
        <div style={{ marginTop: 16, overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '100px repeat(3, 1fr)', gap: 6, minWidth: 600, textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: 12, padding: 8 }}>Frec. \ Imp.</div>
            <div style={{ fontWeight: 'bold', fontSize: 12, padding: 8, background: 'var(--surface-subtle, #f1f5f9)', borderRadius: 4 }}>Impacto Alto</div>
            <div style={{ fontWeight: 'bold', fontSize: 12, padding: 8, background: 'var(--surface-subtle, #f1f5f9)', borderRadius: 4 }}>Impacto Medio</div>
            <div style={{ fontWeight: 'bold', fontSize: 12, padding: 8, background: 'var(--surface-subtle, #f1f5f9)', borderRadius: 4 }}>Impacto Bajo</div>

            {nivelesFrecuencia.map((frec) => (
              <React.Fragment key={frec}>
                <div style={{ fontWeight: 'bold', fontSize: 12, padding: 8, background: 'var(--surface-subtle, #f1f5f9)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                      style={{
                        minHeight: 90,
                        padding: 6,
                        border: '1px solid var(--line, #e2e8f0)',
                        borderRadius: 6,
                        background: esCritico ? '#fff1f2' : 'var(--bg, #fafafa)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        textAlign: 'left',
                      }}
                    >
                      {filtrados.map((inc, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            padding: 6,
                            background: '#fff',
                            border: '1px solid var(--line, #cbd5e1)',
                            borderRadius: 4,
                            fontSize: 11,
                          }}
                        >
                          <strong style={{ display: 'block' }}>{inc.nombre}</strong>
                          <span style={{ color: 'var(--muted, #64748b)', fontSize: 10 }}>{inc.perfilNombre}</span>
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
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {momentos?.map((m: MomentosCriticosArtifact) => (
            <div key={m.id} style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b>{m.contenido.perfilUsuario.nombre}</b>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(m)}
                    style={{ cursor: 'pointer', color: 'var(--teal, #0d9488)', background: 'none', border: 0, fontWeight: 500 }}
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
                    style={{ cursor: 'pointer', color: 'var(--coral, #ef4444)', background: 'none', border: 0 }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              <small style={{ color: 'var(--muted)' }}>{m.contenido.incidentes.length} incidente(s)</small>
            </div>
          ))}
          {momentos && momentos.length === 0 && <p>No hay momentos críticos todavía.</p>}
        </div>
      )}
    </div></div>
  );
}
