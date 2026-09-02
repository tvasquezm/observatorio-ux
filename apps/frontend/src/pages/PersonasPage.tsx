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

const CAMPOS_LISTA: (keyof PersonaContenido)[] = [
  'hobbies', 'habilidades', 'objetivos', 'necesidades',
  'motivaciones', 'frustraciones', 'comportamientos', 'expectativas',
];

function vacio(): PersonaContenido {
  return {
    nombreCompleto: '',
    hobbies: [], habilidades: [], objetivos: [], necesidades: [],
    motivaciones: [], frustraciones: [], comportamientos: [], expectativas: [],
  };
}

function vacioListInputs(): Record<string, string> {
  return CAMPOS_LISTA.reduce((acc, campo) => ({ ...acc, [campo]: '' }), {});
}

export function PersonasPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const { data: personas, isLoading } = usePersonas(proyectoId);
  const { mutate: crear, isPending: isCreating } = useCreatePersona(proyectoId);
  const { mutate: actualizar, isPending: isUpdating } = useUpdatePersona(proyectoId);
  const { mutate: eliminar } = useDeletePersona(proyectoId);

  const [form, setForm] = useState<PersonaContenido>(vacio());
  const [listInputs, setListInputs] = useState<Record<string, string>>(vacioListInputs());
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  function resetForm() {
    setForm(vacio());
    setListInputs(vacioListInputs());
    setEditandoId(null);
    setMostrarForm(false);
  }

  function handleIniciarEditar(persona: PersonaArtifact) {
    setEditandoId(persona.artefactoLogicoId || persona.id);
    setForm(persona.contenido);
    
    const inputsState: Record<string, string> = {};
    CAMPOS_LISTA.forEach((campo) => {
      const arr = persona.contenido[campo];
      inputsState[campo] = Array.isArray(arr) ? arr.join(', ') : '';
    });
    setListInputs(inputsState);
    setMostrarForm(true);
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
      actualizar(
        { artefactoId: editandoId, contenido: payload },
        { onSuccess: resetForm }
      );
    } else {
      crear(payload, { onSuccess: resetForm });
    }
  }

  const isPending = isCreating || isUpdating;

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Personas</h2>
        <button className="secondary" onClick={() => { if (mostrarForm) resetForm(); else setMostrarForm(true); }}>
          {mostrarForm ? 'Cancelar' : '+ Nueva persona'}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8, margin: '12px 0', padding: 12, border: '1px solid var(--line)', borderRadius: 8 }}>
          <h3>{editandoId ? 'Editar Persona' : 'Nueva Persona'}</h3>
          
          <input
            placeholder="Nombre completo *"
            value={form.nombreCompleto}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, nombreCompleto: e.target.value })}
            required
            style={{ padding: 8 }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input
              placeholder="Edad"
              type="number"
              value={form.edad ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, edad: e.target.value ? Number(e.target.value) : undefined })}
              style={{ padding: 8 }}
            />
            <input
              placeholder="Ocupación"
              value={form.ocupacion ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, ocupacion: e.target.value })}
              style={{ padding: 8 }}
            />
          </div>
          <textarea
            placeholder="Acerca de..."
            value={form.acercaDe ?? ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, acercaDe: e.target.value })}
            style={{ padding: 8, minHeight: 60 }}
          />
          {CAMPOS_LISTA.map((campo) => (
            <input
              key={campo}
              placeholder={`${campo} (separados por coma)`}
              value={listInputs[campo] ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setListInputs({ ...listInputs, [campo]: e.target.value })}
              style={{ padding: 8 }}
            />
          ))}
          <button type="submit" className="primary" disabled={isPending}>
            {isPending ? 'Guardando…' : editandoId ? 'Actualizar persona' : 'Guardar persona'}
          </button>
        </form>
      )}

      {isLoading && <p>Cargando…</p>}

      <div style={{ display: 'grid', gap: 8 }}>
        {personas?.map((p: PersonaArtifact) => (
          <div key={p.id} style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b>{p.contenido.nombreCompleto}</b>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => handleIniciarEditar(p)}
                  style={{ cursor: 'pointer', color: 'var(--teal, #0d9488)', background: 'none', border: 0, fontWeight: 500 }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de eliminar esta versión?')) {
                      eliminar(p.id);
                    }
                  }}
                  style={{ cursor: 'pointer', color: 'var(--coral)', background: 'none', border: 0 }}
                >
                  Eliminar
                </button>
              </div>
            </div>
            {p.contenido.ocupacion && (
              <small style={{ color: 'var(--muted)' }}>
                {p.contenido.ocupacion}{p.contenido.edad ? ` · ${p.contenido.edad} años` : ''}
              </small>
            )}
          </div>
        ))}
        {personas && personas.length === 0 && !isLoading && <p>No hay personas todavía.</p>}
      </div>
    </div>
  );
}