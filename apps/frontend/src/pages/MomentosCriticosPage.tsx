// apps/frontend/src/pages/MomentosCriticosPage.tsx

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import {
  useCreateCriticalMoment,
  useDeleteCriticalMoment,
  useCriticalMoments,
} from '../features/momentos-criticos/hooks/useMomentosCriticosQueries';
import type {
  IncidenteCritico,
  MomentosCriticosContenido,
} from '../features/momentos-criticos/api/momentos-criticos.api';

function incidenteVacio(): IncidenteCritico {
  return {
    nombre: '', descripcion: '', tipo: 'Negativo', impacto: 'Medio', frecuencia: 'Media',
    causa: '', accionesSugeridas: [],
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
  const { data: momentos, isLoading } = useCriticalMoments(proyectoId);
  const { mutate: crear, isPending } = useCreateCriticalMoment(proyectoId);
  const { mutate: eliminar } = useDeleteCriticalMoment(proyectoId);
  const [form, setForm] = useState<MomentosCriticosContenido>(contenidoVacio());
  const [mostrarForm, setMostrarForm] = useState(false);

  function actualizarIncidente(campo: keyof IncidenteCritico, valor: string) {
    const incidente = { ...form.incidentes[0] };
    if (campo === 'accionesSugeridas') {
      (incidente as any)[campo] = valor.split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      (incidente as any)[campo] = valor;
    }
    setForm({ ...form, incidentes: [incidente] });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.perfilUsuario.nombre.trim() || !form.incidentes[0].nombre.trim()) return;
    crear(form, { onSuccess: () => { setForm(contenidoVacio()); setMostrarForm(false); } });
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Momentos Críticos</h2>
        <button className="secondary" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? 'Cancelar' : '+ Nuevo momento crítico'}
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

          <input
            placeholder="Nombre del incidente *"
            value={form.incidentes[0].nombre}
            onChange={(e) => actualizarIncidente('nombre', e.target.value)}
            required
            style={{ padding: 8 }}
          />
          <textarea
            placeholder="Descripción"
            value={form.incidentes[0].descripcion}
            onChange={(e) => actualizarIncidente('descripcion', e.target.value)}
            style={{ padding: 8, minHeight: 50 }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <select value={form.incidentes[0].tipo} onChange={(e) => actualizarIncidente('tipo', e.target.value)} style={{ padding: 8 }}>
              <option value="Positivo">Positivo</option>
              <option value="Negativo">Negativo</option>
            </select>
            <select value={form.incidentes[0].impacto} onChange={(e) => actualizarIncidente('impacto', e.target.value)} style={{ padding: 8 }}>
              <option value="Alto">Impacto Alto</option>
              <option value="Medio">Impacto Medio</option>
              <option value="Bajo">Impacto Bajo</option>
            </select>
            <select value={form.incidentes[0].frecuencia} onChange={(e) => actualizarIncidente('frecuencia', e.target.value)} style={{ padding: 8 }}>
              <option value="Alta">Frecuencia Alta</option>
              <option value="Media">Frecuencia Media</option>
              <option value="Baja">Frecuencia Baja</option>
            </select>
          </div>
          <input
            placeholder="Causa"
            value={form.incidentes[0].causa}
            onChange={(e) => actualizarIncidente('causa', e.target.value)}
            style={{ padding: 8 }}
          />
          <input
            placeholder="Acciones sugeridas (separadas por coma)"
            value={form.incidentes[0].accionesSugeridas.join(', ')}
            onChange={(e) => actualizarIncidente('accionesSugeridas', e.target.value)}
            style={{ padding: 8 }}
          />

          <button type="submit" className="primary" disabled={isPending}>
            {isPending ? 'Guardando…' : 'Guardar momento crítico'}
          </button>
        </form>
      )}

      {isLoading && <p>Cargando…</p>}

      <div style={{ display: 'grid', gap: 8 }}>
        {momentos?.map((m) => (
          <div key={m.id} style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <b>{m.contenido.perfilUsuario.nombre}</b>
              <button onClick={() => eliminar(m.artefactoLogicoId)} style={{ cursor: 'pointer', color: 'var(--coral)', background: 'none', border: 0 }}>
                Eliminar
              </button>
            </div>
            <small style={{ color: 'var(--muted)' }}>{m.contenido.incidentes.length} incidente(s)</small>
          </div>
        ))}
        {momentos && momentos.length === 0 && <p>No hay momentos críticos todavía.</p>}
      </div>
    </div>
  );
}
