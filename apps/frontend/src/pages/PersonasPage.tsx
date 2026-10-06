import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import {
  useCreatePersona,
  useUpdatePersona,
  useDeletePersona,
  usePersonas,
} from '../features/persona/hooks/usePersonaQueries';
import type { PersonaContenido, PersonaArtifact } from '../features/persona/api/persona.api';
import { ArtifactsApiError } from '../shared/api/artifacts.api';
import { notify } from '../shared/api/toast';
import { useConfirm } from '../shared/api/confirm';
import { puedeEditarArtefactos } from '../shared/auth/permisos';
import { useActivePerspective } from '../shared/auth/useActivePerspective';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { useProject } from '../features/projects/hooks/useProjectsQueries';
import { TechniquePageHeader } from '../shared/components/TechniquePageHeader';
import { useArtifactEditLock } from '../shared/hooks/useArtifactEditLock';
import { useUnsavedChanges } from '../shared/hooks/useUnsavedChanges';

const CAMPOS_LISTA: (keyof PersonaContenido)[] = [
  'hobbies',
  'habilidades',
  'objetivos',
  'necesidades',
  'motivaciones',
  'frustraciones',
  'comportamientos',
  'expectativas',
  'caracteristicasDistintivas',
  'evidencia',
];

const ETIQUETAS_CAMPOS: Record<string, string> = {
  hobbies: 'Hobbies',
  habilidades: 'Habilidades',
  objetivos: 'Objetivos',
  necesidades: 'Necesidades',
  motivaciones: 'Motivaciones',
  frustraciones: 'Frustraciones / barreras',
  comportamientos: 'Comportamientos',
  expectativas: 'Expectativas',
  caracteristicasDistintivas: 'Características distintivas',
  evidencia: 'Evidencia que sustenta el perfil',
  familia: 'Familia o contexto familiar',
  fotografiaUrl: 'URL de fotografía',
  contextoDeUso: 'Contexto de uso',
  rolEnServicio: 'Rol en el servicio',
  relacionConServicio: 'Relación con el servicio',
  observacionesValidacion: 'Observaciones de validación',
};

const CAMPOS_CONTEXTO = [
  'familia', 'fotografiaUrl', 'contextoDeUso', 'rolEnServicio',
  'relacionConServicio', 'observacionesValidacion',
] as const;

function vacio(): PersonaContenido {
  return {
    nombreCompleto: '',
    hobbies: [],
    habilidades: [],
    objetivos: [],
    necesidades: [],
    motivaciones: [],
    frustraciones: [],
    comportamientos: [],
    expectativas: [],
    caracteristicasDistintivas: [],
    evidencia: [],
    estadoValidacion: 'PENDIENTE',
  };
}

function vacioListInputs(): Record<string, string> {
  return CAMPOS_LISTA.reduce((acc, campo) => ({ ...acc, [campo]: '' }), {});
}

export function PersonasPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const { data: personas, isLoading, isError: isListError, error: listError } = usePersonas(proyectoId);
  const { mutate: crear, isPending: isCreating, error: createError } = useCreatePersona(proyectoId);
  const { mutate: actualizar, isPending: isUpdating, error: updateError } = useUpdatePersona(proyectoId);
  const { mutate: eliminar, error: deleteError } = useDeletePersona(proyectoId);
  const editLock = useArtifactEditLock(proyectoId);
  const confirm = useConfirm();
  const user = useAuthStore((state) => state.user);
  const { data: proyecto } = useProject(proyectoId);
  const puedeEditar = puedeEditarArtefactos(useActivePerspective(), user?.id, proyecto?.creadoPorId);
  const error = listError ?? createError ?? updateError ?? deleteError;

  const [form, setForm] = useState<PersonaContenido>(vacio());
  const [listInputs, setListInputs] = useState<Record<string, string>>(vacioListInputs());
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoVersion, setEditandoVersion] = useState<number | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const { confirmDiscard } = useUnsavedChanges(mostrarForm, { form, listInputs }, isCreating || isUpdating, editandoId ?? 'new');

  function resetForm() {
    editLock.release();
    setForm(vacio());
    setListInputs(vacioListInputs());
    setEditandoId(null);
    setEditandoVersion(null);
    setMostrarForm(false);
    setReadOnly(false);
  }

  async function handleIniciarEditar(persona: PersonaArtifact) {
    if (!(await confirmDiscard())) return;
    editLock.release();
    const artefactoId = persona.id;
    setEditandoId(artefactoId);
    setEditandoVersion(persona.version);
    setForm(persona.contenido);
    
    const inputsState: Record<string, string> = {};
    CAMPOS_LISTA.forEach((campo) => {
      const arr = persona.contenido[campo];
      inputsState[campo] = Array.isArray(arr) ? arr.join(', ') : '';
    });
    setListInputs(inputsState);
    setMostrarForm(true);
    setReadOnly(false);

    void editLock.acquire(artefactoId).catch((err) => {
      const msg = err instanceof ArtifactsApiError && err.status === 409
        ? 'Otro usuario está editando esta persona ahora mismo.'
        : 'No se pudo bloquear la persona para editar.';
      notify.error(msg);
      setReadOnly(true);
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.nombreCompleto.trim()) return;

    const payload: PersonaContenido = { ...form };
    CAMPOS_LISTA.forEach((campo) => {
      const rawText = listInputs[campo] || '';
      const arrayValores = rawText.split(',').map((s: string) => s.trim()).filter(Boolean);
      (payload as unknown as Record<string, string[]>)[campo] = arrayValores;
    });

    if (editandoId) {
      const idAEditar = editandoId;
      actualizar(
        { artefactoId: idAEditar, contenido: payload, expectedVersion: editandoVersion ?? undefined },
        {
          onSuccess: resetForm,
        }
      );
    } else {
      crear(payload, { onSuccess: resetForm });
    }
  }

  const isPending = isCreating || isUpdating;

  function renderListFields(campos: (keyof PersonaContenido)[]) {
    return campos.map((campo) => (
      <label className="field" key={campo}>
        {ETIQUETAS_CAMPOS[campo]}
        <input
          aria-label={ETIQUETAS_CAMPOS[campo]}
          aria-describedby="persona-list-hint"
          placeholder="Separa los elementos con comas"
          value={listInputs[campo] ?? ''}
          onChange={(e) => setListInputs({ ...listInputs, [campo]: e.target.value })}
        />
      </label>
    ));
  }

  return (
    <div className="artifact-page personas-page">
      <TechniquePageHeader
        label="TÉCNICA DE INVESTIGACIÓN"
        title="Personas"
        description="Construye perfiles claros para diseñar con las necesidades reales en mente."
        action={puedeEditar ? (
          <button type="button" className={mostrarForm ? 'secondary' : 'primary'}
            disabled={isCreating || isUpdating}
            onClick={async () => { if (mostrarForm) { if (await confirmDiscard()) resetForm(); } else setMostrarForm(true); }}>
            {mostrarForm ? 'Cancelar' : '+ Nueva persona'}
          </button>
        ) : <span className="short-id">Solo lectura</span>}
      />

      {puedeEditar && mostrarForm && (
        <form onSubmit={handleSubmit} className="panel persona-editor" aria-labelledby="persona-editor-title">
          <div className="persona-editor-head">
            <div>
              <span className="eyebrow">CONSTRUCCIÓN DEL PERFIL</span>
              <h3 id="persona-editor-title">{editandoId ? 'Editar persona' : 'Nueva persona'}</h3>
              <p>Describe a quién representa este perfil y qué evidencia lo sustenta.</p>
            </div>
            <span className="short-id">{editandoVersion ? `Versión ${editandoVersion}` : 'Nuevo perfil'}</span>
          </div>
          <p className="persona-form-note" id="persona-list-hint">
            El nombre es obligatorio. En los campos de lista, separa cada elemento con una coma.
          </p>
          {(readOnly || editLock.lockLost) && (
            <p className="inline-state inline-state--error" role="alert">
              Esta persona está bloqueada por otro usuario. No puedes editarla en este momento.
            </p>
          )}
          <fieldset disabled={readOnly || editLock.lockLost} className="readonly-fieldset">
            <section className="persona-form-section" aria-labelledby="persona-identidad">
              <div className="persona-section-intro">
                <span className="persona-step" aria-hidden="true">01</span>
                <h4 id="persona-identidad">Identidad y contexto personal</h4>
                <p>Quién es, cómo vive y qué caracteriza su día a día.</p>
              </div>
              <div className="persona-fields">
                <label className="field">
                  Nombre completo <span aria-hidden="true">*</span>
                  <input aria-label="Nombre completo" value={form.nombreCompleto} required maxLength={150}
                    placeholder="Nombre del perfil"
                    onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })} />
                </label>
                <label className="field">
                  Edad
                  <input type="number" min={0} max={120} step={1} value={form.edad ?? ''} placeholder="En años"
                    onChange={(e) => setForm({ ...form, edad: e.target.value ? Number(e.target.value) : undefined })} />
                </label>
                <label className="field">
                  Ocupación
                  <input value={form.ocupacion ?? ''} maxLength={150} placeholder="Profesión, estudio o actividad"
                    onChange={(e) => setForm({ ...form, ocupacion: e.target.value })} />
                </label>
                <label className="field">
                  Familia o contexto familiar
                  <input value={form.familia ?? ''} maxLength={500} placeholder="Contexto de convivencia"
                    onChange={(e) => setForm({ ...form, familia: e.target.value })} />
                </label>
                <label className="field persona-field-wide">
                  Acerca de
                  <textarea value={form.acercaDe ?? ''} maxLength={2000} rows={3}
                    placeholder="Describe brevemente quién es y qué caracteriza a este perfil."
                    onChange={(e) => setForm({ ...form, acercaDe: e.target.value })} />
                </label>
                {renderListFields(['hobbies', 'habilidades'])}
                <label className="field persona-field-wide">
                  URL de fotografía
                  <input type="url" value={form.fotografiaUrl ?? ''} placeholder="https://…"
                    onChange={(e) => setForm({ ...form, fotografiaUrl: e.target.value || undefined })} />
                </label>
              </div>
            </section>

            <section className="persona-form-section" aria-labelledby="persona-necesidades">
              <div className="persona-section-intro">
                <span className="persona-step" aria-hidden="true">02</span>
                <h4 id="persona-necesidades">Necesidades y comportamiento</h4>
                <p>Qué busca conseguir, qué necesita y qué barreras encuentra.</p>
              </div>
              <div className="persona-fields">
                {renderListFields(['objetivos', 'necesidades', 'motivaciones', 'frustraciones', 'comportamientos', 'expectativas'])}
              </div>
            </section>

            <section className="persona-form-section" aria-labelledby="persona-servicio">
              <div className="persona-section-intro">
                <span className="persona-step" aria-hidden="true">03</span>
                <h4 id="persona-servicio">Relación con el servicio</h4>
                <p>Cómo interactúa y qué distingue este perfil de otros.</p>
              </div>
              <div className="persona-fields">
                <label className="field">
                  Contexto de uso
                  <textarea value={form.contextoDeUso ?? ''} maxLength={1000} rows={3}
                    placeholder="Entorno, situación o condiciones de uso."
                    onChange={(e) => setForm({ ...form, contextoDeUso: e.target.value })} />
                </label>
                <label className="field">
                  Rol en el servicio
                  <textarea value={form.rolEnServicio ?? ''} maxLength={1000} rows={3}
                    placeholder="Función que cumple y nivel de influencia."
                    onChange={(e) => setForm({ ...form, rolEnServicio: e.target.value })} />
                </label>
                <label className="field persona-field-wide">
                  Relación con el servicio
                  <textarea value={form.relacionConServicio ?? ''} maxLength={1500} rows={3}
                    placeholder="Frecuencia, canales y relevancia del servicio en su vida."
                    onChange={(e) => setForm({ ...form, relacionConServicio: e.target.value })} />
                </label>
                <div className="persona-field-wide persona-fields">
                  {renderListFields(['caracteristicasDistintivas'])}
                </div>
              </div>
            </section>

            <section className="persona-form-section" aria-labelledby="persona-evidencia">
              <div className="persona-section-intro">
                <span className="persona-step" aria-hidden="true">04</span>
                <h4 id="persona-evidencia">Evidencia y validación</h4>
                <p>Las fuentes y la revisión que respaldan la caracterización.</p>
              </div>
              <div className="persona-fields">
                {renderListFields(['evidencia'])}
                <label className="field">
                  Estado de validación
                  <select value={form.estadoValidacion ?? 'PENDIENTE'}
                    onChange={(e) => setForm({ ...form, estadoValidacion: e.target.value as PersonaContenido['estadoValidacion'] })}>
                    <option value="PENDIENTE">Pendiente de validar</option>
                    <option value="VALIDADA">Validada</option>
                  </select>
                </label>
                <label className="field persona-field-wide">
                  Observaciones de validación
                  <textarea value={form.observacionesValidacion ?? ''} maxLength={1500} rows={3}
                    placeholder="Comentarios y aspectos considerados al revisar el perfil."
                    onChange={(e) => setForm({ ...form, observacionesValidacion: e.target.value })} />
                </label>
              </div>
            </section>
            <div className="persona-form-actions">
              <p>Guarda el perfil cuando hayas terminado de revisarlo.</p>
              <button type="submit" className="primary" disabled={isPending}>
                {isPending ? 'Guardando…' : editandoId ? 'Actualizar persona' : 'Guardar persona'}
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {isLoading && <p role="status">Cargando perfiles…</p>}
      {error && <p className="inline-state inline-state--error" role="alert">
        {isListError ? 'No se pudo cargar las personas. ' : ''}{(error as Error).message}
      </p>}

      {personas && personas.length > 0 && (
        <div className="persona-list-head">
          <h3>Perfiles del proyecto</h3>
          <span className="short-id">{personas.length} {personas.length === 1 ? 'perfil' : 'perfiles'}</span>
        </div>
      )}
      <div className="persona-profile-grid">
        {personas?.map((p: PersonaArtifact) => (
          <article key={p.id} className="panel persona-profile" aria-labelledby={`persona-name-${p.id}`}>
            <div className="persona-profile-head">
              <span className="person-avatar persona-profile-avatar" aria-hidden="true">
                {p.contenido.nombreCompleto.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
              </span>
              <div className="persona-profile-identity">
                <h3 id={`persona-name-${p.id}`}>{p.contenido.nombreCompleto}</h3>
                <p>{[p.contenido.ocupacion, p.contenido.edad !== undefined ? `${p.contenido.edad} años` : null].filter(Boolean).join(' · ') || 'Sin datos demográficos registrados'}</p>
              </div>
            </div>
            <div className="persona-profile-meta">
              <span className={p.contenido.estadoValidacion === 'VALIDADA' ? 'count' : 'short-id'}>
                {p.contenido.estadoValidacion === 'VALIDADA' ? 'Validada' : 'Validación pendiente'}
              </span>
              <span className="text-muted-xs">Versión {p.version}</span>
            </div>
            {p.contenido.acercaDe && <p className="persona-profile-about">{p.contenido.acercaDe}</p>}
            <div className="persona-profile-highlights">
              <div><h4>Objetivos</h4><p>{p.contenido.objetivos?.[0] || 'Sin objetivos registrados'}</p></div>
              <div><h4>Necesidades</h4><p>{p.contenido.necesidades?.[0] || 'Sin necesidades registradas'}</p></div>
            </div>
            <details className="persona-profile-details">
              <summary>Ver perfil completo</summary>
              <dl className="persona-detail-grid">
                {CAMPOS_CONTEXTO.map((campo) => p.contenido[campo] && (
                  <div key={campo}><dt>{ETIQUETAS_CAMPOS[campo]}</dt><dd>{p.contenido[campo]}</dd></div>
                ))}
                {CAMPOS_LISTA.map((campo) => {
                  const valores = p.contenido[campo];
                  return Array.isArray(valores) && valores.length > 0 ? (
                    <div key={campo}>
                      <dt>{ETIQUETAS_CAMPOS[campo]}</dt>
                      <dd><ul>{valores.map((valor, index) => <li key={index}>{valor}</li>)}</ul></dd>
                    </div>
                  ) : null;
                })}
              </dl>
            </details>
            {puedeEditar && (
              <div className="persona-profile-actions">
                <button type="button" className="secondary" onClick={() => handleIniciarEditar(p)}>Editar</button>
                <button type="button" className="text-button text-button--danger" onClick={async () => {
                  if (await confirm('¿Estás seguro de eliminar esta versión?')) eliminar(p.id);
                }}>Eliminar</button>
              </div>
            )}
          </article>
        ))}
      </div>
      {personas && personas.length === 0 && !isLoading && !mostrarForm && (
        <div className="empty-state persona-empty">
          <span className="person-avatar persona-profile-avatar" aria-hidden="true">P</span>
          <strong>No hay personas todavía</strong>
          <p>{puedeEditar ? 'Usa «Nueva persona» para construir el primer perfil del proyecto.' : 'Los perfiles aparecerán aquí cuando el equipo los registre.'}</p>
        </div>
      )}
    </div>
  );
}
