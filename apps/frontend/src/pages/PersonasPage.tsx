// apps/frontend/src/pages/PersonasPage.tsx

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import {
  useCreatePersona,
  useDeletePersona,
  usePersonas,
} from '../features/persona/hooks/usePersonaQueries';
import type { PersonaContenido } from '../features/persona/api/persona.api';

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

export function PersonasPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const { data: personas, isLoading } = usePersonas(proyectoId);
  const { mutate: crear, isPending } = useCreatePersona(proyectoId);
  const { mutate: eliminar } = useDeletePersona(proyectoId);
  const [form, setForm] = useState<PersonaContenido>(vacio());
  const [mostrarForm, setMostrarForm] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombreCompleto.trim()) return;
    crear(form, { onSuccess: () => { setForm(vacio()); setMostrarForm(false); } });
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Personas</h2>
        <button className="secondary" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? 'Cancelar' : '+ Nueva persona'}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8, margin: '12px 0', padding: 12, border: '1px solid var(--line)', borderRadius: 8 }}>
          <input
            placeholder="Nombre completo *"
            value={form.nombreCompleto}
            onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })}
            required
            style={{ padding: 8 }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input
              placeholder="Edad"
              type="number"
              value={form.edad ?? ''}
              onChange={(e) => setForm({ ...form, edad: e.target.value ? Number(e.target.value) : undefined })}
              style={{ padding: 8 }}
            />
            <input
              placeholder="Ocupación"
              value={form.ocupacion ?? ''}
              onChange={(e) => setForm({ ...form, ocupacion: e.target.value })}
              style={{ padding: 8 }}
            />
          </div>
          <textarea
            placeholder="Acerca de..."
            value={form.acercaDe ?? ''}
            onChange={(e) => setForm({ ...form, acercaDe: e.target.value })}
            style={{ padding: 8, minHeight: 60 }}
          />
          {CAMPOS_LISTA.map((campo) => (
            <input
              key={campo}
              placeholder={`${campo} (separados por coma)`}
              value={(form[campo] as string[]).join(', ')}
              onChange={(e) =>
                setForm({
                  ...form,
                  [campo]: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
              style={{ padding: 8 }}
            />
          ))}
          <button type="submit" className="primary" disabled={isPending}>
            {isPending ? 'Guardando…' : 'Guardar persona'}
          </button>
        </form>
      )}

      {isLoading && <p>Cargando…</p>}

      <div style={{ display: 'grid', gap: 8 }}>
        {personas?.map((p) => (
          <div key={p.id} style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <b>{p.contenido.nombreCompleto}</b>
              <button onClick={() => eliminar(p.artefactoLogicoId)} style={{ cursor: 'pointer', color: 'var(--coral)', background: 'none', border: 0 }}>
                Eliminar
              </button>
            </div>
            {p.contenido.ocupacion && <small style={{ color: 'var(--muted)' }}>{p.contenido.ocupacion}{p.contenido.edad ? ` · ${p.contenido.edad} años` : ''}</small>}
          </div>
        ))}
        {personas && personas.length === 0 && <p>No hay personas todavía.</p>}
      </div>
    </div>
  );
}
