import React, { useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MomentosCriticosSchema } from '@observatorio-ux/shared-types';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import {
  useCreateCriticalMoment,
  useUpdateCriticalMoment,
  useDeleteCriticalMoment,
  useCriticalMoments,
} from '../features/momentos-criticos/hooks/useMomentosCriticosQueries';
import {
  addIncidente,
  removeIncidente,
  prioridadNumerica,
  type IncidenteCritico,
  type MomentosCriticosContenido,
  type MomentosCriticosArtifact,
} from '../features/momentos-criticos/api/momentos-criticos.api';
import { ArtifactsApiError } from '../shared/api/artifacts.api';
import { notify } from '../shared/api/toast';
import { useConfirm } from '../shared/api/confirm';
import { TechniquePageHeader } from '../shared/components/TechniquePageHeader';
import { TechniquePage } from '../shared/components/TechniquePage';
import { TechniqueNewButton } from '../shared/components/TechniqueNewButton';
import { TechniqueItemActions } from '../shared/components/TechniqueItemActions';
import { puedeEditarArtefactos } from '../shared/auth/permisos';
import { useActivePerspective } from '../shared/auth/useActivePerspective';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { useProject } from '../features/projects/hooks/useProjectsQueries';
import { useArtifactEditLock } from '../shared/hooks/useArtifactEditLock';
import { useUnsavedChanges } from '../shared/hooks/useUnsavedChanges';
import { TechniqueProcess } from '../shared/components/TechniqueProcess';
import { PasosTecnica } from '../shared/components/PasosTecnica';
import {
  IncidentMeters,
  MomentosDistribucion,
  MomentosMatrix,
} from '../features/momentos-criticos/components/MomentosVisual';
import { prioridad, procesoMomentos } from '../features/momentos-criticos/momentos-visual';
import { ComentariosTecnica } from '../features/comments/components/ComentariosTecnica';

const incidenteVacio = (): IncidenteCritico => ({
  nombre: '',
  descripcion: '',
  tipo: 'Negativo',
  impacto: 'Medio',
  frecuencia: 'Media',
  causa: '',
  accionesSugeridas: [],
});
const contenidoVacio = (): MomentosCriticosContenido => ({
  perfilUsuario: { id: crypto.randomUUID(), nombre: '', rol: '' },
  incidentes: [incidenteVacio()],
});
export function MomentosCriticosPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const {
    data: momentos = [],
    isLoading,
    isError: isListError,
    error: listError,
  } = useCriticalMoments(proyectoId);
  const { mutate: crear, isPending: isCreating, error: createError } = useCreateCriticalMoment(proyectoId);
  const {
    mutate: actualizar,
    isPending: isUpdating,
    error: updateError,
  } = useUpdateCriticalMoment(proyectoId);
  const { mutate: eliminar, isPending: isDeleting, error: deleteError } = useDeleteCriticalMoment(proyectoId);
  const editLock = useArtifactEditLock(proyectoId);
  const confirm = useConfirm();
  const user = useAuthStore((state) => state.user);
  const { data: proyecto } = useProject(proyectoId);
  const puedeEditar = puedeEditarArtefactos(useActivePerspective(), user?.id, proyecto?.creadoPorId);
  const [form, setForm] = useState(contenidoVacio);
  const [accionesInputs, setAccionesInputs] = useState(['']);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [vistaMatriz, setVistaMatriz] = useState(false);
  const [editando, setEditando] = useState<MomentosCriticosArtifact | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [lockPending, setLockPending] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [busqueda, setBusqueda] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('Todos');
  const editRequest = useRef(0);
  const isSaving = isCreating || isUpdating;
  const disabled = isSaving || lockPending || readOnly || editLock.lockLost;
  const { confirmDiscard } = useUnsavedChanges(mostrarForm, { form, accionesInputs }, isSaving, editando?.id ?? 'new');

  function resetForm() {
    editRequest.current += 1;
    editLock.release();
    setForm(contenidoVacio());
    setAccionesInputs(['']);
    setEditando(null);
    setMostrarForm(false);
    setReadOnly(false);
    setLockPending(false);
    setErrores({});
  }
  async function cancelar() {
    if (isSaving) return;
    if (!(await confirmDiscard())) return;
    resetForm();
  }
  function nuevo() {
    setMostrarForm(true);
  }
  async function handleStartEdit(m: MomentosCriticosArtifact) {
    if (mostrarForm || !puedeEditar) return;
    const acciones = m.contenido.incidentes.map((inc) => inc.accionesSugeridas.join('\n'));
    setEditando(m);
    setForm(m.contenido);
    setAccionesInputs(acciones);
    setErrores({});
    setMostrarForm(true);
    setLockPending(true);
    const request = ++editRequest.current;
    try {
      const acquired = await editLock.acquire(m.id);
      if (request === editRequest.current && !acquired) setReadOnly(true);
    } catch (err) {
      if (request !== editRequest.current) return;
      notify.error(
        err instanceof ArtifactsApiError && err.status === 409
          ? 'Otro usuario está editando este momento crítico ahora mismo.'
          : 'No se pudo bloquear el momento crítico para editar.',
      );
      setReadOnly(true);
    } finally {
      if (request === editRequest.current) setLockPending(false);
    }
  }
  function actualizarIncidente(index: number, campo: keyof IncidenteCritico, valor: string) {
    if (campo === 'accionesSugeridas')
      setAccionesInputs((inputs) => inputs.map((text, i) => (i === index ? valor : text)));
    else
      setForm((actual) => ({
        ...actual,
        incidentes: actual.incidentes.map((inc, i) => (i === index ? { ...inc, [campo]: valor } : inc)),
      }));
  }
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!puedeEditar || disabled) return;
    const resultado = MomentosCriticosSchema.safeParse({
      ...form,
      incidentes: form.incidentes.map((inc, i) => ({
        ...inc,
        accionesSugeridas: accionesInputs[i]
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean),
      })),
    });
    if (!resultado.success) {
      setErrores(
        Object.fromEntries(resultado.error.issues.map((issue) => [issue.path.join('.'), issue.message])),
      );
      return;
    }
    setErrores({});
    if (editando)
      actualizar(
        { artefactoId: editando.id, contenido: resultado.data, expectedVersion: editando.version },
        { onSuccess: resetForm },
      );
    else crear(resultado.data, { onSuccess: resetForm });
  }
  const fieldError = (path: string) => ({
    'aria-invalid': Boolean(errores[path]),
    'aria-describedby': errores[path] ? 'mc-validation-errors' : undefined,
  });
  const todos = momentos.flatMap((m) =>
    m.contenido.incidentes.map((inc, index) => ({
      ...inc,
      key: `${m.artefactoLogicoId}-${index}`,
      perfilNombre: m.contenido.perfilUsuario.nombre,
    })),
  );
  const coincide = (inc: IncidenteCritico, perfil: string) =>
    (tipoFiltro === 'Todos' || inc.tipo === tipoFiltro) &&
    `${perfil} ${inc.nombre} ${inc.descripcion} ${inc.causa} ${inc.accionesSugeridas.join(' ')}`
      .toLocaleLowerCase('es')
      .includes(busqueda.trim().toLocaleLowerCase('es'));
  const filtrados = todos.filter((inc) => coincide(inc, inc.perfilNombre));
  const error = listError ?? createError ?? updateError ?? deleteError;
  const enFormulario = puedeEditar && mostrarForm;
  const listado = !isLoading && !isListError && !enFormulario;
  const perfilCompleto = form.perfilUsuario.nombre.trim() !== '' && form.perfilUsuario.rol.trim() !== '';
  const incidentesEnVivo = form.incidentes
    .map((inc, i) => ({
      ...inc,
      accionesSugeridas: (accionesInputs[i] ?? '')
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
    }))
    .filter((inc) => inc.nombre.trim() !== '' && inc.descripcion.trim() !== '');
  const campos = (contenido: React.ReactNode) => (
    <fieldset disabled={disabled} className="readonly-fieldset">
      {contenido}
    </fieldset>
  );
  const porIncidente = (render: (inc: IncidenteCritico, i: number) => React.ReactNode) =>
    form.incidentes.map((inc, i) => (
      <div key={i} className="mini-card mc-incident-form">
        <h5>
          Incidente {i + 1}
          {inc.nombre.trim() ? `: ${inc.nombre.trim()}` : ''}
        </h5>
        {render(inc, i)}
      </div>
    ));

  return (
    <TechniquePage
      className="mc-page"
      cabecera={
        <TechniquePageHeader
          label="TÉCNICA DE INVESTIGACIÓN"
          title="Momentos críticos"
          description="Documenta lo que ocurre, comprende sus causas y decide qué mejorar o reforzar."
          instructions={[
            'Describe una situación concreta observada o relatada por un usuario: identifica su perfil, qué ocurrió, la causa y una acción. Si la causa es una hipótesis, indícalo expresamente.',
            'Impacto: alto si impide completar una tarea, medio si la dificulta y bajo si causa una molestia menor. Frecuencia: alta si ocurre habitualmente, media si se repite ocasionalmente y baja si es excepcional. Sustenta estos niveles con tu evidencia.',
            'La prioridad orientativa de problemas multiplica impacto y frecuencia (1 a 3): alta desde 6, media entre 3 y 4, baja entre 1 y 2. Las experiencias positivas se muestran como oportunidades de refuerzo. Esta escala no sustituye el análisis cualitativo.',
          ]}
          action={
            <TechniqueNewButton
              etiqueta="+ Nuevo momento crítico"
              abierto={mostrarForm}
              puedeEditar={puedeEditar}
              disabled={isSaving}
              onClick={() => (mostrarForm ? void cancelar() : nuevo())}
            />
          }
        />
      }
      proceso={
        enFormulario ? (
          <TechniqueProcess
            title="Proceso de momentos críticos"
            textoListo="Momento crítico completo: ya puedes guardarlo"
            steps={procesoMomentos(perfilCompleto ? 1 : 0, incidentesEnVivo)}
          />
        ) : listado ? (
          <TechniqueProcess
            title="Proceso de momentos críticos"
            textoListo="Momentos críticos completos y listos para usar"
            steps={procesoMomentos(momentos.length, todos)}
          />
        ) : null
      }
      resumen={
        listado && (
          <>
            <section className="analytics-kpis mc-stats" aria-label="Resumen de incidentes">
              <article className="analytics-kpi">
                <span>Incidentes registrados</span>
                <strong>{todos.length}</strong>
              </article>
              <article className="analytics-kpi">
                <span>Problemas de prioridad alta</span>
                <strong>
                  {todos.filter((inc) => inc.tipo === 'Negativo' && prioridadNumerica(inc) >= 6).length}
                </strong>
              </article>
              <article className="analytics-kpi">
                <span>Experiencias positivas</span>
                <strong>{todos.filter((inc) => inc.tipo === 'Positivo').length}</strong>
              </article>
            </section>
            <MomentosDistribucion incidentes={todos} />
          </>
        )
      }
      formulario={
        enFormulario && (
          <section className="panel">
            <form onSubmit={handleSubmit} className="entity-card form mc-form" noValidate>
              <h3>{editando ? 'Editar Momento Crítico' : 'Nuevo Momento Crítico'}</h3>
              {lockPending && <p role="status">Obteniendo permiso de edición…</p>}
              {(readOnly || editLock.lockLost) && (
                <p role="alert" className="error-text">
                  Este momento crítico está bloqueado por otro usuario o perdió el permiso de edición. No puedes
                  guardar; conserva tu información y vuelve a abrirlo.
                </p>
              )}
              {Object.keys(errores).length > 0 && (
                <div id="mc-validation-errors" role="alert" className="error-text">
                  <strong>Revisa los campos indicados:</strong>
                  <ul>
                    {Object.entries(errores).map(([path, mensaje]) => (
                      <li key={path}>
                        {path.startsWith('incidentes.') ? `Incidente ${Number(path.split('.')[1]) + 1}: ` : ''}
                        {mensaje}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <PasosTecnica
                pasos={[
                  {
                    id: 'perfil',
                    titulo: 'Perfil de usuario',
                    ayuda: 'Define a quién le ocurrió la situación.',
                    contenido: campos(
                      <div className="tv-pasos-campos">
                        <label className="field">
                          Nombre del perfil de usuario
                          <input
                            {...fieldError('perfilUsuario.nombre')}
                            value={form.perfilUsuario.nombre}
                            onChange={(e) =>
                              setForm({ ...form, perfilUsuario: { ...form.perfilUsuario, nombre: e.target.value } })
                            }
                            required
                          />
                        </label>
                        <label className="field">
                          Rol
                          <input
                            {...fieldError('perfilUsuario.rol')}
                            placeholder="Ej. Compradora frecuente"
                            value={form.perfilUsuario.rol}
                            onChange={(e) =>
                              setForm({ ...form, perfilUsuario: { ...form.perfilUsuario, rol: e.target.value } })
                            }
                            required
                          />
                        </label>
                      </div>,
                    ),
                  },
                  {
                    id: 'incidentes',
                    titulo: 'Incidentes',
                    ayuda: 'Describe qué ocurrió, en qué tarea y con qué evidencia. Puedes registrar varios incidentes.',
                    contenido: campos(
                      <>
                        {form.incidentes.map((inc, i) => (
                          <section key={i} className="mini-card mc-incident-form" aria-label={`Incidente ${i + 1}`}>
                            <div className="row-between">
                              <h4>Incidente {i + 1}</h4>
                              <button
                                type="button"
                                className="link-btn link-btn--warn"
                                disabled={form.incidentes.length <= 1}
                                onClick={() => {
                                  if (form.incidentes.length <= 1) return;
                                  setForm(removeIncidente(form, i));
                                  setAccionesInputs(accionesInputs.filter((_, index) => index !== i));
                                }}
                              >
                                Quitar incidente
                              </button>
                            </div>
                            <label className="field">
                              Nombre del incidente {i + 1}
                              <input
                                {...fieldError(`incidentes.${i}.nombre`)}
                                value={inc.nombre}
                                onChange={(e) => actualizarIncidente(i, 'nombre', e.target.value)}
                                required
                              />
                            </label>
                            <label className="field">
                              Descripción incidente {i + 1}
                              <textarea
                                {...fieldError(`incidentes.${i}.descripcion`)}
                                placeholder="Qué ocurrió, en qué tarea y qué evidencia lo sustenta"
                                value={inc.descripcion}
                                onChange={(e) => actualizarIncidente(i, 'descripcion', e.target.value)}
                                required
                              />
                            </label>
                          </section>
                        ))}
                        <div className="row-gap">
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => {
                              setForm(addIncidente(form, incidenteVacio()));
                              setAccionesInputs([...accionesInputs, '']);
                            }}
                          >
                            + Agregar incidente
                          </button>
                        </div>
                      </>,
                    ),
                  },
                  {
                    id: 'causas',
                    titulo: 'Causas',
                    ayuda: 'Explica por qué ocurrió. Si es una hipótesis, indícalo.',
                    contenido: campos(
                      porIncidente((inc, i) => (
                        <label className="field">
                          Causa incidente {i + 1}
                          <textarea
                            {...fieldError(`incidentes.${i}.causa`)}
                            placeholder="Causa observada o hipótesis por validar"
                            value={inc.causa}
                            onChange={(e) => actualizarIncidente(i, 'causa', e.target.value)}
                            required
                          />
                        </label>
                      )),
                    ),
                  },
                  {
                    id: 'valoracion',
                    titulo: 'Impacto y frecuencia',
                    ayuda:
                      'Impacto: alto si impide completar una tarea, medio si la dificulta, bajo si es una molestia menor. Frecuencia: alta si es habitual, media si es ocasional, baja si es excepcional.',
                    contenido: campos(
                      porIncidente((inc, i) => (
                        <div className="form-grid-3">
                          <label className="field">
                            Tipo incidente {i + 1}
                            <select value={inc.tipo} onChange={(e) => actualizarIncidente(i, 'tipo', e.target.value)}>
                              <option>Negativo</option>
                              <option>Positivo</option>
                            </select>
                          </label>
                          <label className="field">
                            Impacto incidente {i + 1}
                            <select
                              value={inc.impacto}
                              onChange={(e) => actualizarIncidente(i, 'impacto', e.target.value)}
                            >
                              <option>Alto</option>
                              <option>Medio</option>
                              <option>Bajo</option>
                            </select>
                          </label>
                          <label className="field">
                            Frecuencia incidente {i + 1}
                            <select
                              value={inc.frecuencia}
                              onChange={(e) => actualizarIncidente(i, 'frecuencia', e.target.value)}
                            >
                              <option>Alta</option>
                              <option>Media</option>
                              <option>Baja</option>
                            </select>
                          </label>
                        </div>
                      )),
                    ),
                  },
                  {
                    id: 'acciones',
                    titulo: 'Acciones sugeridas',
                    ayuda: 'Propone qué mejorar o reforzar. Una acción concreta por línea.',
                    contenido: campos(
                      porIncidente((_inc, i) => (
                        <label className="field">
                          Acciones sugeridas incidente {i + 1}
                          <textarea
                            {...fieldError(`incidentes.${i}.accionesSugeridas`)}
                            placeholder="Una acción por línea; puedes usar comas dentro de una acción"
                            value={accionesInputs[i] ?? ''}
                            onChange={(e) => actualizarIncidente(i, 'accionesSugeridas', e.target.value)}
                            required
                          />
                        </label>
                      )),
                    ),
                  },
                ]}
                acciones={
                  <>
                    {!perfilCompleto && (
                      <span className="tv-pasos-motivo" role="status">
                        Falta el nombre y el rol del perfil (paso 1).
                      </span>
                    )}
                    <button type="submit" className="primary" disabled={disabled || !perfilCompleto}>
                      {isSaving
                        ? 'Guardando…'
                        : editando
                          ? 'Actualizar momento crítico'
                          : 'Guardar momento crítico'}
                    </button>
                  </>
                }
              />
            </form>
          </section>
        )
      }
      lista={
        <>
          {isLoading && <p role="status">Cargando momentos críticos…</p>}
          {error && (
            <p role="alert" className="error-text">
              {isListError ? 'No se pudieron cargar los momentos críticos. ' : ''}
              {(error as Error).message}
            </p>
          )}
          {listado && (
            <section className="panel">
              <div className="panel-head">
                <h2>Incidentes y acciones</h2>
                <div className="row-gap">
                  <button
                    className="secondary"
                    type="button"
                    aria-pressed={vistaMatriz}
                    onClick={() => setVistaMatriz((v) => !v)}
                  >
                    {vistaMatriz ? 'Ver Lista' : 'Ver Matriz 3x3'}
                  </button>
                </div>
              </div>
              {listado && todos.length > 0 && (
                <div className="mc-filters">
                  <label className="field">
                    Buscar incidentes
                    <input
                      type="search"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Nombre, perfil, causa o acción"
                    />
                  </label>
                  <label className="field">
                    Tipo de incidente
                    <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
                      <option value="Todos">Todos</option>
                      <option value="Negativo">Negativos</option>
                      <option value="Positivo">Positivos</option>
                    </select>
                  </label>
                  <p role="status">
                    {filtrados.length} de {todos.length} incidentes
                  </p>
                </div>
              )}
              {listado && todos.length > 0 && filtrados.length === 0 && (
                <p>No hay incidentes que coincidan con estos filtros.</p>
              )}
              {listado && vistaMatriz && todos.length > 0 && (
                <MomentosMatrix incidentes={filtrados} />
              )}
              {listado && !vistaMatriz && (
                <div className="list-stack">
                  {momentos.map((m) => {
                    const incidentes = m.contenido.incidentes
                      .filter((inc) => coincide(inc, m.contenido.perfilUsuario.nombre))
                      .sort((a, b) => prioridadNumerica(b) - prioridadNumerica(a));
                    if (incidentes.length === 0) return null;
                    return (
                      <article
                        key={m.id}
                        className="entity-card mc-profile"
                        aria-label={m.contenido.perfilUsuario.nombre}
                      >
                        <div className="row-between">
                          <div>
                            <h3>{m.contenido.perfilUsuario.nombre}</h3>
                            <p className="text-muted">
                              {m.contenido.perfilUsuario.rol} · Versión {m.version}
                            </p>
                          </div>
                          {puedeEditar && (
                            <TechniqueItemActions
                              disabled={mostrarForm || isDeleting}
                              onEditar={() => void handleStartEdit(m)}
                              onEliminar={async () => {
                                if (await confirm('¿Estás seguro de eliminar este momento crítico?'))
                                  eliminar(m.id);
                              }}
                            />
                          )}
                        </div>
                        {incidentes.map((inc, i) => (
                          <section
                            key={i}
                            className={`mc-incident ${inc.tipo === 'Negativo' ? 'mc-negative' : 'mc-positive'}`}
                            aria-label={inc.nombre}
                          >
                            <div className="row-between">
                              <h4>{inc.nombre}</h4>
                              <span className="mc-priority">{prioridad(inc)}</span>
                            </div>
                            <p className="text-muted">
                              {inc.tipo} · Impacto {inc.impacto.toLowerCase()} · Frecuencia{' '}
                              {inc.frecuencia.toLowerCase()}
                            </p>
                            <IncidentMeters inc={inc} />
                            <p>{inc.descripcion}</p>
                            <details>
                              <summary>Ver causa y acciones</summary>
                              <p>
                                <b>Causa:</b> {inc.causa}
                              </p>
                              <h5>Acciones sugeridas</h5>
                              <ul>
                                {inc.accionesSugeridas.map((a, index) => (
                                  <li key={index}>{a}</li>
                                ))}
                              </ul>
                            </details>
                          </section>
                        ))}
                      </article>
                    );
                  })}
                </div>
              )}
              {listado && todos.length === 0 && (
                <div className="mc-empty">
                  <h3>Aún no hay momentos críticos</h3>
                  <p>
                    Registra el perfil de un usuario y su primer incidente para comenzar a analizar la experiencia.
                  </p>
                </div>
              )}
            </section>
          )}
        </>
      }
      comentarios={<ComentariosTecnica proyectoId={proyectoId} tecnica="momentos-criticos" />}
    />
  );
}
