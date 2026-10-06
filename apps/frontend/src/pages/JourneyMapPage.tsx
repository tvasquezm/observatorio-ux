import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import {
  useCreateJourney,
  useJourneys,
} from '../features/journey-map/hooks/useJourneyMapQueries';
import type {
  JourneyMapContenido,
  JourneyMapArtifact,
  Phase,
} from '../features/journey-map/api/journey-map.api';
import { puedeEditarArtefactos } from '../shared/auth/permisos';
import { useActivePerspective } from '../shared/auth/useActivePerspective';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { useProject } from '../features/projects/hooks/useProjectsQueries';
import { TechniquePageHeader } from '../shared/components/TechniquePageHeader';
import { useUnsavedChanges } from '../shared/hooks/useUnsavedChanges';

const CAMPOS_LISTA: (keyof Phase)[] = [
  'actividades',
  'touchpoints',
  'pensamientos',
  'dificultades',
  'ganancias',
  'oportunidades',
];

const ETIQUETAS_CAMPOS: Record<string, string> = {
  actividades: 'Actividades',
  touchpoints: 'Puntos de contacto',
  pensamientos: 'Pensamientos',
  dificultades: 'Dificultades / puntos de dolor',
  ganancias: 'Ganancias / aspectos positivos',
  oportunidades: 'Oportunidades de mejora',
};

const MIN_FASES = 3;

function faseVacia(nombre: string): Phase {
  return {
    nombre,
    actividades: [],
    touchpoints: [],
    pensamientos: [],
    emocion: 'Neutral',
    dificultades: [],
    ganancias: [],
    oportunidades: [],
  };
}

function contenidoVacio(): JourneyMapContenido {
  return {
    perfilUsuario: {
      id: crypto.randomUUID(),
      nombre: '',
      rol: '',
    },
    objetivo: '',
    eventoInicio: '',
    fases: [
      faseVacia('Descubrimiento'),
      faseVacia('Consideración'),
      faseVacia('Decisión'),
    ],
    evidencia: [],
  };
}

function vacioListInputs(): Record<string, string> {
  return CAMPOS_LISTA.reduce(
    (acc, campo) => ({ ...acc, [campo]: '' }),
    {},
  );
}


export function JourneyMapPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();

  const {
    data: journeyMaps,
    isLoading,
    isError: isListError,
    error: listError,
  } = useJourneys(proyectoId);

  const {
    mutate: crear,
    isPending: isCreating,
    error: createError,
  } = useCreateJourney(proyectoId);

  const user = useAuthStore((state) => state.user);
  const { data: proyecto } = useProject(proyectoId);

  const puedeEditar = puedeEditarArtefactos(
    useActivePerspective(),
    user?.id,
    proyecto?.creadoPorId,
  );

  const error = listError ?? createError;

  const [form, setForm] = useState<JourneyMapContenido>(contenidoVacio());
  const [listInputs, setListInputs] = useState<Record<string, string>[]>(
    Array.from({ length: MIN_FASES }, vacioListInputs),
  );
  const [evidenciaInput, setEvidenciaInput] = useState('');
  const [journeyConsultado, setJourneyConsultado] =
    useState<JourneyMapArtifact | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const { confirmDiscard } = useUnsavedChanges(
    mostrarForm,
    { form, listInputs, evidenciaInput },
    isCreating,
  );

  function resetForm() {
    setForm(contenidoVacio());
    setListInputs(Array.from({ length: MIN_FASES }, vacioListInputs));
    setEvidenciaInput('');
    setMostrarForm(false);
  }


  function actualizarFase(
    index: number,
    cambios: Partial<Phase>,
  ) {
    setForm((actual) => ({
      ...actual,
      fases: actual.fases.map((fase, i) =>
        i === index ? { ...fase, ...cambios } : fase,
      ),
    }));
  }

  function actualizarLista(
    faseIndex: number,
    campo: keyof Phase,
    valor: string,
  ) {
    const valores = valor
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    actualizarFase(faseIndex, {
      [campo]: valores,
    } as Partial<Phase>);

    setListInputs((actual) => {
      const copia = [...actual];
      copia[faseIndex] = {
        ...copia[faseIndex],
        [campo]: valor,
      };
      return copia;
    });
  }

  function agregarFase() {
    setForm((actual) => ({
      ...actual,
      fases: [
        ...actual.fases,
        faseVacia(`Fase ${actual.fases.length + 1}`),
      ],
    }));

    setListInputs((actual) => [
      ...actual,
      vacioListInputs(),
    ]);
  }

  function eliminarFase(index: number) {
    if (form.fases.length <= MIN_FASES) return;

    setForm((actual) => ({
      ...actual,
      fases: actual.fases.filter((_, i) => i !== index),
    }));

    setListInputs((actual) =>
      actual.filter((_, i) => i !== index),
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.perfilUsuario.nombre.trim()) return;

    const payload: JourneyMapContenido = {
      ...form,
      perfilUsuario: {
        ...form.perfilUsuario,
        nombre: form.perfilUsuario.nombre.trim(),
        rol: form.perfilUsuario.rol.trim(),
      },
      objetivo: form.objetivo?.trim() || undefined,
      eventoInicio: form.eventoInicio?.trim() || undefined,
      evidencia: evidenciaInput
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      fases: form.fases.map((fase, index) => ({
        ...fase,
        nombre: fase.nombre.trim(),
        actividades: (listInputs[index]?.actividades ?? '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        touchpoints: (listInputs[index]?.touchpoints ?? '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        pensamientos: (listInputs[index]?.pensamientos ?? '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        dificultades: (listInputs[index]?.dificultades ?? '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        ganancias: (listInputs[index]?.ganancias ?? '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        oportunidades: (listInputs[index]?.oportunidades ?? '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      })),
    };

    crear(payload, {
      onSuccess: resetForm,
    });
  }

  const isPending = isCreating;

  return (
    <div className="artifact-page">
      <TechniquePageHeader
        label="TÉCNICA DE INVESTIGACIÓN"
        title="Journey Maps"
        description="Representa el recorrido de una persona usuaria para identificar actividades, emociones, dificultades y oportunidades de mejora."
        action={<span className="status-pill">Artefactos versionados</span>}
      />

      <div className="panel">
        <div className="panel-head">
          <h2>Journey Maps</h2>

          {puedeEditar && (
            <button
              className="secondary"
              disabled={isCreating}
              onClick={async () => {
                if (mostrarForm) { if (await confirmDiscard()) resetForm(); }
                else setMostrarForm(true);
              }}
            >
              {mostrarForm ? 'Cancelar' : '+ Nuevo Journey Map'}
            </button>
          )}
        </div>

        {puedeEditar && mostrarForm && (
          <form onSubmit={handleSubmit} className="entity-card form">
            <h3>Nuevo Journey Map</h3>

            <fieldset>
              <div
                style={{
                  gridColumn: '1 / -1',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '12px',
                }}
              >
                <input
                  placeholder="Nombre del perfil de usuario *"
                  aria-label="Nombre del perfil de usuario"
                  value={form.perfilUsuario.nombre}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      perfilUsuario: {
                        ...form.perfilUsuario,
                        nombre: e.target.value,
                      },
                    })
                  }
                  required
                  className="input-sm"
                />

                <input
                  placeholder="Rol del usuario *"
                  aria-label="Rol del usuario"
                  value={form.perfilUsuario.rol}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      perfilUsuario: {
                        ...form.perfilUsuario,
                        rol: e.target.value,
                      },
                    })
                  }
                  required
                  className="input-sm"
                />
              </div>

              <div
                style={{
                  gridColumn: '1 / -1',
                  display: 'grid',
                  gap: '12px',
                  marginTop: '8px',
                }}
              >
                <textarea
                  placeholder="Objetivo del recorrido: ¿qué busca lograr la persona?"
                  aria-label="Objetivo del recorrido"
                  value={form.objetivo ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      objetivo: e.target.value,
                    })
                  }
                  className="textarea-sm"
                />

                <textarea
                  placeholder="Evento de inicio: ¿qué situación da comienzo al recorrido?"
                  aria-label="Evento de inicio"
                  value={form.eventoInicio ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      eventoInicio: e.target.value,
                    })
                  }
                  className="textarea-sm"
                />
              </div>

              {form.fases.map((fase, index) => (
                <div
                  key={index}
                  className="entity-card"
                  style={{
                    gridColumn: '1 / -1',
                  }}
                >
                  <div className="row-between">
                    <h3>Fase {index + 1}</h3>

                    {form.fases.length > MIN_FASES && (
                      <button
                        type="button"
                        className="link-btn link-btn--delete"
                        onClick={() => eliminarFase(index)}
                      >
                        Eliminar fase
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: '12px',
                    }}
                  >
                    <input
                      placeholder="Nombre de la fase"
                      aria-label={`Nombre de la fase ${index + 1}`}
                      value={fase.nombre}
                      onChange={(e) =>
                        actualizarFase(index, {
                          nombre: e.target.value,
                        })
                      }
                      className="input-sm"
                      style={{ gridColumn: '1 / -1' }}
                    />

                    {CAMPOS_LISTA.map((campo) => (
                      <input
                        key={campo}
                        placeholder={`${ETIQUETAS_CAMPOS[campo]} (separados por coma)`}
                        aria-label={`${ETIQUETAS_CAMPOS[campo]} fase ${index + 1}`}
                        value={listInputs[index]?.[campo] ?? ''}
                        onChange={(e) =>
                          actualizarLista(index, campo, e.target.value)
                        }
                        className="input-sm"
                      />
                    ))}

                    <select
                      aria-label={`Emoción fase ${index + 1}`}
                      value={fase.emocion}
                      onChange={(e) =>
                        actualizarFase(index, {
                          emocion: e.target.value as Phase['emocion'],
                        })
                      }
                      className="input-sm"
                    >
                      <option value="Positiva">Emoción: positiva</option>
                      <option value="Neutral">Emoción: neutral</option>
                      <option value="Negativa">Emoción: negativa</option>
                    </select>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="secondary"
                onClick={agregarFase}
                style={{ gridColumn: '1 / -1', width: 'fit-content' }}
              >
                + Agregar fase
              </button>

              <textarea
                placeholder="Evidencia: fuentes, entrevistas, observaciones u otros antecedentes que sustentan el Journey Map (separados por coma)."
                aria-label="Evidencia"
                value={evidenciaInput}
                onChange={(e) => setEvidenciaInput(e.target.value)}
                className="textarea-sm"
                style={{
                  gridColumn: '1 / -1',
                  width: '100%',
                  minHeight: '120px',
                  boxSizing: 'border-box',
                }}
              />

              <button
                type="submit"
                className="primary"
                disabled={isPending}
                style={{ gridColumn: '1 / -1', width: 'fit-content' }}
              >
                {isPending ? 'Guardando…' : 'Guardar Journey Map'}
              </button>
            </fieldset>
          </form>
        )}

        {isLoading && <p>Cargando…</p>}

        {error && (
          <p className="error-text">
            {isListError ? 'No se pudieron cargar los Journey Maps. ' : ''}
            {(error as Error).message}
          </p>
        )}

        <div className="form-grid">
          {journeyMaps?.map((journey: JourneyMapArtifact) => (
            <div key={journey.id} className="entity-card">
              <div className="row-between">
                <div>
                  <b>{journey.contenido.perfilUsuario.nombre}</b>

                  <small className="text-muted">
                    {journey.contenido.perfilUsuario.rol}
                    {' · '}
                    {journey.contenido.fases.length} fases
                  </small>
                </div>

                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setJourneyConsultado(
                      journeyConsultado?.id === journey.id ? null : journey,
                    )
                  }
                >
                  {journeyConsultado?.id === journey.id
                    ? 'Cerrar'
                    : 'Consultar'}
                </button>
              </div>

              {journey.contenido.objetivo && (
                <p>{journey.contenido.objetivo}</p>
              )}

              {journeyConsultado?.id === journey.id && (
                <div className="panel mt-16">
                  <h3>Detalle del Journey Map</h3>

                  {journey.contenido.eventoInicio && (
                    <div>
                      <strong>Evento de inicio</strong>
                      <p>{journey.contenido.eventoInicio}</p>
                    </div>
                  )}

                  {journey.contenido.objetivo && (
                    <div>
                      <strong>Objetivo del recorrido</strong>
                      <p>{journey.contenido.objetivo}</p>
                    </div>
                  )}

                  <h4>Recorrido</h4>

                  <div className="form-grid">
                    {journey.contenido.fases.map((fase, index) => (
                      <div key={index} className="entity-card">
                        <div className="row-between">
                          <h4>
                            Fase {index + 1}: {fase.nombre}
                          </h4>

                          <span className="status-pill">
                            {fase.emocion}
                          </span>
                        </div>

                        <div>
                          <strong>Actividades</strong>
                          <p>
                            {fase.actividades.length > 0
                              ? fase.actividades.join(', ')
                              : 'Sin información registrada.'}
                          </p>
                        </div>

                        <div>
                          <strong>Puntos de contacto</strong>
                          <p>
                            {fase.touchpoints.length > 0
                              ? fase.touchpoints.join(', ')
                              : 'Sin información registrada.'}
                          </p>
                        </div>

                        <div>
                          <strong>Pensamientos</strong>
                          <p>
                            {fase.pensamientos.length > 0
                              ? fase.pensamientos.join(', ')
                              : 'Sin información registrada.'}
                          </p>
                        </div>

                        <div>
                          <strong>Dificultades / puntos de dolor</strong>
                          <p>
                            {fase.dificultades.length > 0
                              ? fase.dificultades.join(', ')
                              : 'Sin información registrada.'}
                          </p>
                        </div>

                        <div>
                          <strong>Ganancias / aspectos positivos</strong>
                          <p>
                            {fase.ganancias.length > 0
                              ? fase.ganancias.join(', ')
                              : 'Sin información registrada.'}
                          </p>
                        </div>

                        <div>
                          <strong>Oportunidades de mejora</strong>
                          <p>
                            {fase.oportunidades.length > 0
                              ? fase.oportunidades.join(', ')
                              : 'Sin información registrada.'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-16">
                    <strong>Evidencia</strong>
                    <p>
                      {journey.contenido.evidencia.length > 0
                        ? journey.contenido.evidencia.join(', ')
                        : 'Sin evidencia registrada.'}
                    </p>
                  </div>

                  <small className="text-muted">
                    Registro de consulta. Este Journey Map no puede
                    modificarse ni eliminarse.
                  </small>
                </div>
              )}
            </div>
          ))}

          {journeyMaps &&
            journeyMaps.length === 0 &&
            !isLoading && <p>No hay Journey Maps todavía.</p>}
        </div>
      </div>
    </div>
  );
}
