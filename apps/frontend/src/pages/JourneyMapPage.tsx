// apps/frontend/src/pages/JourneyMapPage.tsx

import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import {
  useCreateJourney,
  useUpdateJourney,
  useDeleteJourney,
  useJourneys,
  useLockJourney,
  useUnlockJourney,
} from '../features/journey-map/hooks/useJourneyMapQueries';
import {
  addPhase,
  removePhase,
  type Emocion,
  type JourneyMapContenido,
  type JourneyMapArtifact,
  type Phase,
} from '../features/journey-map/api/journey-map.api';
import { ArtifactsApiError } from '../shared/api/artifacts.api';
import { notify } from '../shared/api/toast';

const MIN_FASES = 3;

function faseVacia(nombre: string): Phase {
  return { nombre, touchpoints: [], pensamientos: [], emocion: 'Neutral', oportunidades: [] };
}

function contenidoVacio(): JourneyMapContenido {
  return {
    perfilUsuario: { id: crypto.randomUUID(), nombre: '', rol: '' },
    fases: [faseVacia('Descubrimiento'), faseVacia('Consideración'), faseVacia('Decisión')],
  };
}

export function JourneyMapPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const { data: journeys, isLoading, isError: isListError, error: listError } = useJourneys(proyectoId);
  const { mutate: crear, isPending: isCreating, error: createError } = useCreateJourney(proyectoId);
  const { mutate: actualizar, isPending: isUpdating, error: updateError } = useUpdateJourney(proyectoId);
  const { mutate: eliminar, error: deleteError } = useDeleteJourney(proyectoId);
  const { mutate: lockJourney } = useLockJourney(proyectoId);
  const { mutate: unlockJourney } = useUnlockJourney(proyectoId);
  const error = listError ?? createError ?? updateError ?? deleteError;

  const [form, setForm] = useState<JourneyMapContenido>(contenidoVacio());
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  function resetForm() {
    if (editandoId) unlockJourney(editandoId);
    setForm(contenidoVacio());
    setEditandoId(null);
    setMostrarForm(false);
    setReadOnly(false);
  }

  function handleIniciarEditar(journey: JourneyMapArtifact) {
    // Usamos el artefactoLogicoId para versionar la edición
    const artefactoId = journey.artefactoLogicoId || journey.id;
    setEditandoId(artefactoId);
    setForm(journey.contenido);
    setMostrarForm(true);
    setReadOnly(false);

    lockJourney(
      { artefactoId },
      {
        onError: (err) => {
          const msg = err instanceof ArtifactsApiError && err.status === 409
            ? 'Otro usuario está editando este journey map ahora mismo.'
            : 'No se pudo bloquear el journey map para editar.';
          notify.error(msg);
          setReadOnly(true);
        },
      },
    );
  }

  function actualizarFase(index: number, campo: keyof Phase, valor: string) {
    const fases = [...form.fases];
    if (campo === 'touchpoints' || campo === 'pensamientos' || campo === 'oportunidades') {
      fases[index] = { ...fases[index], [campo]: valor.split(',').map((s) => s.trim()).filter(Boolean) };
    } else if (campo === 'emocion') {
      fases[index] = { ...fases[index], emocion: valor as Emocion };
    } else {
      fases[index] = { ...fases[index], nombre: valor };
    }
    setForm({ ...form, fases });
  }

  function handleAgregarFase() {
    setForm(addPhase(form, faseVacia(`Etapa ${form.fases.length + 1}`)));
  }

  function handleQuitarFase(index: number) {
    if (form.fases.length <= MIN_FASES) return;
    setForm(removePhase(form, index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.perfilUsuario.nombre.trim()) return;

    if (editandoId) {
      const idAEditar = editandoId;
      actualizar(
        { artefactoId: idAEditar, contenido: form },
        {
          onSuccess: () => {
            unlockJourney(idAEditar);
            resetForm();
          },
        }
      );
    } else {
      crear(form, { onSuccess: resetForm });
    }
  }

  const isPending = isCreating || isUpdating;

  return (
    <div className="fade">
      <div className="page-head">
        <div>
          <span className="kicker">EXPERIENCIA DE PRINCIPIO A FIN</span>
          <h1>Journey Maps</h1>
          <p>Visualiza el recorrido completo y encuentra el momento en que la experiencia pierde confianza.</p>
        </div>
        <button
          className="primary"
          onClick={() => {
            if (mostrarForm) resetForm();
            else setMostrarForm(true);
          }}
        >
          {mostrarForm ? 'Cancelar' : '+ Nuevo journey map'}
        </button>
      </div>

      {mostrarForm && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8 }}>
            <h2>{editandoId ? 'Editar Journey Map' : 'Nuevo Journey Map'}</h2>
            {readOnly && (
              <p style={{ color: 'var(--coral)' }}>
                Este journey map está bloqueado por otro usuario. No puedes editarlo en este momento.
              </p>
            )}
            <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, display: 'contents' }}>

            <div className="form-grid-2">
              <input
                placeholder="Nombre del perfil de usuario *"
                value={form.perfilUsuario.nombre}
                onChange={(e) => setForm({ ...form, perfilUsuario: { ...form.perfilUsuario, nombre: e.target.value } })}
                required
                style={{ padding: 8 }}
              />
              <input
                placeholder="Rol"
                value={form.perfilUsuario.rol}
                onChange={(e) => setForm({ ...form, perfilUsuario: { ...form.perfilUsuario, rol: e.target.value } })}
                style={{ padding: 8 }}
              />
            </div>

            <small style={{ color: 'var(--muted)' }}>Etapas (mínimo {MIN_FASES}):</small>
            {form.fases.map((fase, i) => (
              <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 6, padding: 8, display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <small style={{ color: 'var(--muted)' }}>Etapa {i + 1}</small>
                  <button
                    type="button"
                    onClick={() => handleQuitarFase(i)}
                    disabled={form.fases.length <= MIN_FASES}
                    title={form.fases.length <= MIN_FASES ? `El journey map debe conservar al menos ${MIN_FASES} etapas` : 'Quitar etapa'}
                    style={{
                      cursor: form.fases.length <= MIN_FASES ? 'not-allowed' : 'pointer',
                      color: form.fases.length <= MIN_FASES ? 'var(--muted)' : 'var(--coral)',
                      background: 'none',
                      border: 0,
                      fontSize: 11,
                    }}
                  >
                    Quitar etapa
                  </button>
                </div>
                <input
                  placeholder="Nombre de la etapa"
                  value={fase.nombre}
                  onChange={(e) => actualizarFase(i, 'nombre', e.target.value)}
                  style={{ padding: 6 }}
                />
                <div className="emotion-picker">
                  <span>Estado emocional</span>
                  {(['Negativa', 'Neutral', 'Positiva'] as Emocion[]).map((valor) => (
                    <button
                      key={valor}
                      type="button"
                      className={fase.emocion === valor ? 'active' : ''}
                      onClick={() => actualizarFase(i, 'emocion', valor)}
                    >
                      {valor === 'Negativa' ? '−' : valor === 'Neutral' ? '•' : '+'}
                    </button>
                  ))}
                  <small style={{ color: 'var(--muted)' }}>{fase.emocion}</small>
                </div>
                <input
                  placeholder="Touchpoints (separados por coma)"
                  value={fase.touchpoints.join(', ')}
                  onChange={(e) => actualizarFase(i, 'touchpoints', e.target.value)}
                  style={{ padding: 6 }}
                />
                <input
                  placeholder="Pensamientos (separados por coma)"
                  value={fase.pensamientos.join(', ')}
                  onChange={(e) => actualizarFase(i, 'pensamientos', e.target.value)}
                  style={{ padding: 6 }}
                />
                <input
                  placeholder="Oportunidades (separadas por coma)"
                  value={fase.oportunidades.join(', ')}
                  onChange={(e) => actualizarFase(i, 'oportunidades', e.target.value)}
                  style={{ padding: 6 }}
                />
              </div>
            ))}

            <button
              type="button"
              className="secondary"
              onClick={handleAgregarFase}
              style={{ justifySelf: 'start' }}
            >
              + Agregar etapa
            </button>

            <button type="submit" className="primary" disabled={isPending} style={{ justifySelf: 'start' }}>
              {isPending ? 'Guardando…' : editandoId ? 'Actualizar journey map' : 'Guardar journey map'}
            </button>
            </fieldset>
          </form>
        </div>
      )}

      {isLoading && <p>Cargando…</p>}
      {error && (
        <p style={{ color: 'var(--coral)' }}>
          {isListError ? 'No se pudo cargar los journey maps. ' : ''}
          {(error as Error).message}
        </p>
      )}

      {journeys && journeys.length === 0 && !isLoading && (
        <div className="panel"><p>No hay journey maps todavía.</p></div>
      )}

      {journeys?.map((j: JourneyMapArtifact) => {
        const avg =
          j.contenido.fases.reduce((acc, f) => acc + (f.emocion === 'Positiva' ? 5 : f.emocion === 'Neutral' ? 3 : 1), 0) /
          j.contenido.fases.length;
        return (
          <article key={j.id} className="panel journey-board rise" style={{ marginBottom: 16 }}>
            <div className="panel-head">
              <div>
                <span className="kicker">RECORRIDO DE {j.contenido.perfilUsuario.nombre.toUpperCase()}</span>
                <h2>{j.contenido.perfilUsuario.rol || 'Journey Map'}</h2>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span className="count">Emoción media {avg.toFixed(1)}/5</span>
                <button
                  type="button"
                  onClick={() => handleIniciarEditar(j)}
                  style={{ cursor: 'pointer', color: 'var(--teal)', background: 'none', border: 0, fontWeight: 700, fontSize: 11 }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de eliminar este journey map?')) {
                      eliminar(j.id);
                    }
                  }}
                  style={{ cursor: 'pointer', color: 'var(--coral)', background: 'none', border: 0, fontSize: 11 }}
                >
                  Eliminar
                </button>
              </div>
            </div>

            <div className="journey-chart">
              <div className="journey-axis">
                <span>fluida</span>
                <span>neutra</span>
                <span>difícil</span>
              </div>
              <div className="journey-gridline" />
              <div className="stage-row">
                {j.contenido.fases.map((fase, i) => (
                  <div key={i} className="stage active">
                    <span className={`emotion ${fase.emocion}`}>
                      {fase.emocion === 'Negativa' ? '−' : fase.emocion === 'Neutral' ? '•' : '+'}
                    </span>
                    <strong>{fase.nombre}</strong>
                    <small>{fase.touchpoints[0] || 'Sin touchpoints'}</small>
                  </div>
                ))}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
