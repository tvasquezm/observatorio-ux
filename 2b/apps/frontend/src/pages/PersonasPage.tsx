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
import { TechniquePage } from '../shared/components/TechniquePage';
import { TechniqueNewButton } from '../shared/components/TechniqueNewButton';
import { TechniqueItemActions } from '../shared/components/TechniqueItemActions';
import { TechniqueProcess } from '../shared/components/TechniqueProcess';
import { PasosTecnica } from '../shared/components/PasosTecnica';
import { useArtifactEditLock } from '../shared/hooks/useArtifactEditLock';
import { useUnsavedChanges } from '../shared/hooks/useUnsavedChanges';
import { PersonaCard } from '../features/persona/components/PersonaCard';
import { ETIQUETAS_CAMPOS, procesoPersona } from '../features/persona/persona-visual';
import { ComentariosTecnica } from '../features/comments/components/ComentariosTecnica';

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
  const { mutate: eliminar, error: deleteError, isPending: isDeleting, variables: deletingId, reset: resetDelete } = useDeletePersona(proyectoId);
  const editLock = useArtifactEditLock(proyectoId);
  const confirm = useConfirm();
  const user = useAuthStore((state) => state.user);
  const { data: proyecto } = useProject(proyectoId);
  const puedeEditar = puedeEditarArtefactos(useActivePerspective(), user?.id, proyecto?.creadoPorId);
  const error = listError ?? createError ?? updateError;

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

  const contenidoEnVivo: PersonaContenido = { ...form };
  CAMPOS_LISTA.forEach((campo) => {
    const arrayValores = (listInputs[campo] || '').split(',').map((v: string) => v.trim()).filter(Boolean);
    (contenidoEnVivo as unknown as Record<string, string[]>)[campo] = arrayValores;
  });
  const nombreCompleto = form.nombreCompleto.trim() !== '';

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nombreCompleto) return;
    const payload = contenidoEnVivo;

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
  const enFormulario = puedeEditar && mostrarForm;
  const bloqueado = readOnly || editLock.lockLost || isPending || isDeleting;
  const campos = (contenido: React.ReactNode) => (
    <fieldset disabled={bloqueado} className="readonly-fieldset">
      {contenido}
    </fieldset>
  );

  function renderListFields(campos: (keyof PersonaContenido)[]) {
    return campos.map((campo) => (
      <label className="field" key={campo}>
        {ETIQUETAS_CAMPOS[campo]}
        <input
          aria-label={ETIQUETAS_CAMPOS[campo]}
          placeholder="Separa los elementos con comas"
          value={listInputs[campo] ?? ''}
          onChange={(e) => setListInputs({ ...listInputs, [campo]: e.target.value })}
        />
      </label>
    ));
  }

  return (
    <TechniquePage
      className="personas-page"
      cabecera={
      <TechniquePageHeader
        label="TÉCNICA DE INVESTIGACIÓN"
        title="Personas"
        description="Construye perfiles claros para diseñar con las necesidades reales en mente."
        instructions={['Crea una persona e identifica su contexto y rol.', 'Completa objetivos, necesidades y frustraciones con evidencia de tu investigación.', 'Guarda el perfil y revísalo con tu equipo antes de marcarlo como validado.']}
        action={
          <TechniqueNewButton
            etiqueta="+ Nueva persona"
            abierto={mostrarForm}
            puedeEditar={puedeEditar}
            disabled={isCreating || isUpdating || isDeleting}
            onClick={async () => { if (mostrarForm) { if (await confirmDiscard()) resetForm(); } else setMostrarForm(true); }}
          />
        }
      />
      }
      proceso={enFormulario && (
        <TechniqueProcess
          title="Proceso de la persona"
          textoListo="Persona completa: ya puedes guardarla"
          steps={procesoPersona(contenidoEnVivo)}
        />
      )}
      formulario={enFormulario && (
        <form onSubmit={handleSubmit} className="panel persona-editor" aria-labelledby="persona-editor-title" noValidate>
          <div className="persona-editor-head">
            <div>
              <span className="eyebrow">CONSTRUCCIÓN DEL PERFIL</span>
              <h3 id="persona-editor-title">{editandoId ? 'Editar persona' : 'Nueva persona'}</h3>
              <p>Describe a quién representa este perfil y qué evidencia lo sustenta.</p>
            </div>
            <span className="short-id">{editandoVersion ? `Versión ${editandoVersion}` : 'Nuevo perfil'}</span>
          </div>
          {(readOnly || editLock.lockLost) && (
            <p className="inline-state inline-state--error" role="alert">
              Esta persona está bloqueada por otro usuario. No puedes editarla en este momento.
            </p>
          )}
          <PasosTecnica
            pasos={[
              {
                id: 'identidad',
                titulo: 'Identidad',
                ayuda: 'Quién es y cómo vive. El nombre es obligatorio; en los campos de lista, separa cada elemento con una coma.',
                contenido: campos(
                  <div className="tv-pasos-campos">
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
                  </div>,
                ),
              },
              {
                id: 'objetivos',
                titulo: 'Objetivos y necesidades',
                ayuda: 'Qué busca conseguir y qué necesita. Separa los elementos con comas.',
                contenido: campos(
                  <div className="tv-pasos-campos">
                    {renderListFields(['objetivos', 'necesidades', 'motivaciones', 'expectativas'])}
                  </div>,
                ),
              },
              {
                id: 'barreras',
                titulo: 'Frustraciones y conducta',
                ayuda: 'Qué barreras encuentra y cómo actúa. Separa los elementos con comas.',
                contenido: campos(
                  <div className="tv-pasos-campos">
                    {renderListFields(['frustraciones', 'comportamientos', 'caracteristicasDistintivas'])}
                  </div>,
                ),
              },
              {
                id: 'relacion',
                titulo: 'Relación con el servicio (opcional)',
                ayuda: 'Cómo interactúa con el servicio. Puedes saltar este paso.',
                contenido: campos(
                  <div className="tv-pasos-campos">
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
                  </div>,
                ),
              },
              {
                id: 'evidencia',
                titulo: 'Evidencia (opcional)',
                ayuda: 'Las fuentes que respaldan la caracterización. Separa los elementos con comas.',
                contenido: campos(
                  <div className="tv-pasos-campos tv-pasos-campos--una">
                    {renderListFields(['evidencia'])}
                  </div>,
                ),
              },
              {
                id: 'validacion',
                titulo: 'Confirmación del perfil (opcional)',
                ayuda: 'La revisión del equipo. Guarda cuando hayas terminado.',
                contenido: campos(
                  <div className="tv-pasos-campos">
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
                  </div>,
                ),
              },
            ]}
            acciones={
              <>
                {!nombreCompleto && (
                  <span className="tv-pasos-motivo" role="status">Falta el nombre completo (paso 1).</span>
                )}
                <button type="submit" className="primary" disabled={bloqueado || !nombreCompleto}>
                  {isPending ? 'Guardando…' : editandoId ? 'Actualizar persona' : 'Guardar persona'}
                </button>
              </>
            }
          />
        </form>
      )}
      lista={<>
      {isLoading && <p role="status">Cargando perfiles…</p>}
      {error && <p className="inline-state inline-state--error" role="alert">
        {isListError ? 'No se pudo cargar las personas. ' : ''}{(error as Error).message}
      </p>}

      {!enFormulario && personas && personas.length > 0 && (
        <div className="persona-list-head">
          <h3>Perfiles del proyecto</h3>
          <span className="short-id">{personas.length} {personas.length === 1 ? 'perfil' : 'perfiles'}</span>
        </div>
      )}
      {!enFormulario && <div className="persona-profile-grid">
        {personas?.map((p: PersonaArtifact) => (
          <PersonaCard
            key={p.id}
            persona={p}
            acciones={puedeEditar && (
              <>
                {deletingId === p.id && deleteError && <p role="alert" className="error-text">{deleteError.message}</p>}
                <TechniqueItemActions
                  disabled={isDeleting || isPending}
                  eliminando={isDeleting && deletingId === p.id}
                  onEditar={() => handleIniciarEditar(p)}
                  onEliminar={async () => {
                    if (!(await confirm(`¿Eliminar la persona «${p.contenido.nombreCompleto}» y todas sus versiones? Dejará de aparecer en el proyecto; se conserva el historial de evidencia.`, { confirmLabel: 'Eliminar' }))) return;
                    resetDelete();
                    eliminar(p.id, { onSuccess: () => {
                      if (editandoId === p.id) resetForm();
                      notify.success(`Persona «${p.contenido.nombreCompleto}» eliminada.`);
                    } });
                  }}
                />
              </>
            )}
          />
        ))}
      </div>}
      {personas && personas.length === 0 && !isLoading && !mostrarForm && (
        <div className="empty-state persona-empty">
          <span className="person-avatar persona-profile-avatar" aria-hidden="true">P</span>
          <strong>No hay personas todavía</strong>
          <p>{puedeEditar ? 'Usa «Nueva persona» para construir el primer perfil del proyecto.' : 'Los perfiles aparecerán aquí cuando el equipo los registre.'}</p>
        </div>
      )}
      </>}
      comentarios={<ComentariosTecnica proyectoId={proyectoId} tecnica="personas" />}
    />
  );
}
