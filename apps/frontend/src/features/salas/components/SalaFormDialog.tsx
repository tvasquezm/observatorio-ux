// apps/frontend/src/features/salas/components/SalaFormDialog.tsx
//
// Formulario modal de sala, compartido por la lista de salas (crear y editar) y
// el detalle de la sala (editar). Mantiene el marcado, los textos y la
// validación de fecha de término posterior a la de inicio.

import React, { useEffect, useRef, useState } from 'react';
import { OptionalTag } from '../../../shared/components/OptionalTag';
import { useConfirm } from '../../../shared/api/confirm';
import { createSala, updateSala, type Sala, type UpdateSalaDto } from '../api/salas.api';

export function fechaParaInput(fechaRaw?: string | null) {
  if (!fechaRaw) return '';
  const fecha = new Date(fechaRaw);
  if (Number.isNaN(fecha.getTime())) return '';
  const pad = (valor: number) => String(valor).padStart(2, '0');
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
}

interface SalaFormDialogProps {
  /** Sala a editar. Sin sala, el diálogo crea una nueva. */
  sala?: Sala | null;
  abierto: boolean;
  onClose: () => void;
  /** Se llama con la sala guardada, antes de cerrar. */
  onSaved?: (sala: Sala) => void;
  /** Guardado propio (por ejemplo, la mutación de TanStack Query). Sin esto, usa la API de salas. */
  guardar?: (payload: UpdateSalaDto) => Promise<Sala>;
  /** Avisa si hay cambios sin guardar, para que la pantalla sume ese estado a su bloqueo de navegación. */
  onDirtyChange?: (dirty: boolean) => void;
}

export function SalaFormDialog({ sala = null, abierto, onClose, onSaved, guardar, onDirtyChange }: SalaFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirm = useConfirm();
  const [nombre, setNombre] = useState('');
  const [periodo, setPeriodo] = useState('2026-2');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [instrucciones, setInstrucciones] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [inicial, setInicial] = useState('');

  const valores = { nombre, periodo, fechaInicio, fechaFin, instrucciones };
  const dirty = abierto && JSON.stringify(valores) !== inicial;

  useEffect(() => {
    if (!abierto) return;
    const siguiente = {
      nombre: sala?.nombre ?? '',
      periodo: sala?.periodo ?? '2026-2',
      fechaInicio: fechaParaInput(sala?.fechaInicio),
      fechaFin: fechaParaInput(sala?.fechaFin),
      instrucciones: sala?.instrucciones ?? '',
    };
    setNombre(siguiente.nombre);
    setPeriodo(siguiente.periodo);
    setFechaInicio(siguiente.fechaInicio);
    setFechaFin(siguiente.fechaFin);
    setInstrucciones(siguiente.instrucciones);
    setError('');
    setInicial(JSON.stringify(siguiente));
  }, [abierto, sala]);

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !abierto) return;
    dialog.showModal();
    return () => dialog.close();
  }, [abierto]);

  async function cerrar() {
    if (dirty && !(await confirm('Tienes cambios sin guardar. ¿Quieres descartarlos?', {
      confirmLabel: 'Descartar cambios', cancelLabel: 'Seguir editando',
    }))) return;
    onClose();
  }

  async function handleGuardarSala(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (new Date(fechaFin) <= new Date(fechaInicio)) {
      setError('La fecha de término debe ser posterior a la fecha de inicio.');
      return;
    }
    const base = {
      nombre: nombre.trim(),
      periodo: periodo.trim(),
      fechaInicio: new Date(fechaInicio).toISOString(),
      fechaFin: new Date(fechaFin).toISOString(),
    };
    try {
      setSaving(true);
      const guardada = sala
        ? await (guardar ? guardar({ ...base, instrucciones: instrucciones.trim() }) : updateSala(sala.id, { ...base, instrucciones: instrucciones.trim() }))
        : await createSala({ ...base, instrucciones: instrucciones.trim() || undefined });
      onSaved?.(guardada);
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Error al conectar con el servidor para guardar la sala');
    } finally {
      setSaving(false);
    }
  }

  if (!abierto) return null;

  return (
    <dialog
      ref={dialogRef}
      className="sala-modal"
      aria-labelledby="sala-modal-title"
      onCancel={event => { event.preventDefault(); void cerrar(); }}
    >
      <h3 id="sala-modal-title">
        {sala ? 'Editar sala' : 'Crear nueva sala'}
      </h3>

      {error && (
        <div role="alert" className="sala-form-error">
          {error}
        </div>
      )}

      <form onSubmit={handleGuardarSala} className="sala-form" aria-busy={saving}>
        <div className="sala-field">
          <label htmlFor="sala-nombre">Nombre de la sala</label>
          <input
            id="sala-nombre"
            disabled={saving}
            name="nombre"
            autoFocus
            type="text"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Taller de Usabilidad"
          />
        </div>

        <div className="sala-field">
          <label htmlFor="sala-periodo">Período académico</label>
          <input
            id="sala-periodo"
            disabled={saving}
            name="periodo"
            type="text"
            required
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            placeholder="Ej: 2026-2"
          />
        </div>

        <div className="sala-date-grid">
          <div className="sala-field">
            <label htmlFor="sala-inicio">Inicio</label>
            <input
              id="sala-inicio"
              disabled={saving}
              name="fechaInicio"
              type="datetime-local"
              required
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div className="sala-field">
            <label htmlFor="sala-fin">Término</label>
            <input
              id="sala-fin"
              disabled={saving}
              name="fechaFin"
              type="datetime-local"
              required
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
        </div>

        <div className="sala-field">
          <label htmlFor="sala-instrucciones">Instrucciones o descripción<OptionalTag /></label>
          <textarea
            id="sala-instrucciones"
            disabled={saving}
            name="instrucciones"
            value={instrucciones}
            onChange={(e) => setInstrucciones(e.target.value)}
            rows={3}
            placeholder="Detalles para los estudiantes..."
          />
        </div>

        <div className="sala-form-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => void cerrar()}
            disabled={saving}
          >
            Cancelar
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? 'Guardando…' : sala ? 'Guardar cambios' : 'Guardar Sala'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
