// apps/frontend/src/pages/JourneyMapPage.tsx

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import {
  useCreateJourney,
  useDeleteJourney,
  useJourneys,
} from '../features/journey-map/hooks/useJourneyMapQueries';
import type { Emocion, JourneyMapContenido, Phase } from '../features/journey-map/api/journey-map.api';

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
  const { data: journeys, isLoading } = useJourneys(proyectoId);
  const { mutate: crear, isPending } = useCreateJourney(proyectoId);
  const { mutate: eliminar } = useDeleteJourney(proyectoId);
  const [form, setForm] = useState<JourneyMapContenido>(contenidoVacio());
  const [mostrarForm, setMostrarForm] = useState(false);

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.perfilUsuario.nombre.trim()) return;
    crear(form, { onSuccess: () => { setForm(contenidoVacio()); setMostrarForm(false); } });
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Journey Maps</h2>
        <button className="secondary" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? 'Cancelar' : '+ Nuevo journey map'}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8, margin: '12px 0', padding: 12, border: '1px solid var(--line)', borderRadius: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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

          <small style={{ color: '#888' }}>Etapas (mínimo 3):</small>
          {form.fases.map((fase, i) => (
            <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 6, padding: 8, display: 'grid', gap: 6 }}>
              <input
                placeholder="Nombre de la etapa"
                value={fase.nombre}
                onChange={(e) => actualizarFase(i, 'nombre', e.target.value)}
                style={{ padding: 6 }}
              />
              <select
                value={fase.emocion}
                onChange={(e) => actualizarFase(i, 'emocion', e.target.value)}
                style={{ padding: 6 }}
              >
                <option value="Positiva">Positiva</option>
                <option value="Neutral">Neutral</option>
                <option value="Negativa">Negativa</option>
              </select>
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

          <button type="submit" className="primary" disabled={isPending}>
            {isPending ? 'Guardando…' : 'Guardar journey map'}
          </button>
        </form>
      )}

      {isLoading && <p>Cargando…</p>}

      <div style={{ display: 'grid', gap: 8 }}>
        {journeys?.map((j) => (
          <div key={j.id} style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <b>{j.contenido.perfilUsuario.nombre}</b>
              <button onClick={() => eliminar(j.artefactoLogicoId)} style={{ cursor: 'pointer', color: 'var(--coral)', background: 'none', border: 0 }}>
                Eliminar
              </button>
            </div>
            <small style={{ color: 'var(--muted)' }}>{j.contenido.fases.length} etapas</small>
          </div>
        ))}
        {journeys && journeys.length === 0 && <p>No hay journey maps todavía.</p>}
      </div>
    </div>
  );
}
