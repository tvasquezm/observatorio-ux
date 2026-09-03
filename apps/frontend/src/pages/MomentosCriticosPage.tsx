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
import type {
  IncidenteCritico,
  MomentosCriticosContenido,
  MomentosCriticosArtifact,
} from '../features/momentos-criticos/api/momentos-criticos.api';
import { ArtifactsApiError } from '../shared/api/artifacts.api';
import { notify } from '../shared/api/toast';

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
  const error = listError ?? createError ?? updateError ?? deleteError;

  const [form, setForm] = useState<MomentosCriticosContenido>(contenidoVacio());
  const [accionesInput, setAccionesInput] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [vistaMatriz, setVistaMatriz] = useState(false);
  const [editandoArtefactoId, setEditandoArtefactoId] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  function resetForm() {
    if (editandoArtefactoId) unlockCriticalMoment(editandoArtefactoId);
    setForm(contenidoVacio());
    setAccionesInput('');
    setEditandoArtefactoId(null);
    setMostrarForm(false);
    setReadOnly(false);
  }

  function handleStartEdit(m: MomentosCriticosArtifact) {
    const artefactoId = m.artefactoLogicoId || m.id;
    const primerIncidente = m.contenido.incidentes[0] || incidenteVacio();
    setEditandoArtefactoId(artefactoId);
    setForm(m.contenido);
    setAccionesInput(primerIncidente.accionesSugeridas ? primerIncidente.accionesSugeridas.join(', ') : '');
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

  function actualizarIncidente(campo: keyof IncidenteCritico, valor: string) {
    const incidente = { ...form.incidentes[0] };
    if (campo === 'accionesSugeridas') {
      setAccionesInput(valor);
    } else {
      (incidente as Record<string, unknown>)[campo] = valor;
      setForm({ ...form, incidentes: [incidente] });
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.perfilUsuario.nombre.trim() || !form.incidentes[0].nombre.trim()) return;

    const incidenteFinal: IncidenteCritico = {
      ...form.incidentes[0],
      accionesSugeridas: accionesInput.split(',').map((s: string) => s.trim()).filter(Boolean),
    };

    const payload: MomentosCriticosContenido = {
      ...form,
      incidentes: [incidenteFinal],
    };

    if (editandoArtefactoId) {
      const idAEditar = editandoArtefactoId;
      actualizar(
        { artefactoId: idAEditar, contenido: payload },
        {
          onSuccess: () => {
            unlockCriticalMoment(idAEditar);
            resetForm();
          },
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
              value={form.perfilUsuario.nombre}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, perfilUsuario: { ...form.perfilUsuario, nombre: e.target.value } })}
              required
              style={{ padding: 8 }}
            />
            <input
              placeholder="Rol"
              value={form.perfilUsuario.rol}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, perfilUsuario: { ...form.perfilUsuario, rol: e.target.value } })}
              style={{ padding: 8 }}
            />
          </div>

          <input
            placeholder="Nombre del incidente *"
            value={form.incidentes[0].nombre}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => actualizarIncidente('nombre', e.target.value)}
            required
            style={{ padding: 8 }}
          />
          <textarea
            placeholder="Descripción"
            value={form.incidentes[0].descripcion}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => actualizarIncidente('descripcion', e.target.value)}
            style={{ padding: 8, minHeight: 50 }}
          />
          <div className="form-grid-3">
            <select value={form.incidentes[0].tipo} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => actualizarIncidente('tipo', e.target.value)} style={{ padding: 8 }}>
              <option value="Positivo">Positivo</option>
              <option value="Negativo">Negativo</option>
            </select>
            <select value={form.incidentes[0].impacto} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => actualizarIncidente('impacto', e.target.value)} style={{ padding: 8 }}>
              <option value="Alto">Impacto Alto</option>
              <option value="Medio">Impacto Medio</option>
              <option value="Bajo">Impacto Bajo</option>
            </select>
            <select value={form.incidentes[0].frecuencia} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => actualizarIncidente('frecuencia', e.target.value)} style={{ padding: 8 }}>
              <option value="Alta">Frecuencia Alta</option>
              <option value="Media">Frecuencia Media</option>
              <option value="Baja">Frecuencia Baja</option>
            </select>
          </div>
          <input
            placeholder="Causa"
            value={form.incidentes[0].causa}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => actualizarIncidente('causa', e.target.value)}
            style={{ padding: 8 }}
          />
          <input
            placeholder="Acciones sugeridas (separadas por coma)"
            value={accionesInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => actualizarIncidente('accionesSugeridas', e.target.value)}
            style={{ padding: 8 }}
          />

          <button type="submit" className="primary" disabled={isSaving}>
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
                    onClick={() => {
                      if (window.confirm('¿Estás seguro de eliminar este momento crítico?')) {
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
    </div>
  );
}