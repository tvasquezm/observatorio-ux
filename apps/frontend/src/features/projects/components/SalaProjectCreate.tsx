import { useRef, useState, type FormEvent } from 'react';
import { useCreateProject } from '../hooks/useProjectsQueries';
import { ProjectCreateForm } from './ProjectCreateForm';
import type { Sala } from '../../salas/api/salas.api';
import { useUnsavedChanges } from '../../../shared/hooks/useUnsavedChanges';

export function SalaProjectCreate({ sala }: { sala: Sala }) {
  const [open, setOpen] = useState(false);
  const empty = { nombre: '', descripcion: '', salaId: sala.id };
  const [value, setValue] = useState(empty);
  const { mutate, isPending, error } = useCreateProject();
  const { confirmDiscard } = useUnsavedChanges(open, value, isPending, sala.id);
  const trigger = useRef<HTMLButtonElement>(null);
  function close() { setOpen(false); setValue(empty); trigger.current?.focus(); }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.nombre.trim()) return;
    mutate({ nombre: value.nombre.trim(), descripcion: value.descripcion.trim() || undefined, salaId: sala.id }, { onSuccess: close });
  }
  return <section>
    <button ref={trigger} type="button" className="primary" aria-expanded={open} aria-controls="crear-proyecto" disabled={isPending}
      onClick={async () => { if (open) { if (await confirmDiscard()) close(); } else setOpen(true); }}>Crear proyecto en esta sala</button>
    {open && <ProjectCreateForm value={value} onChange={setValue} salas={[sala]} salaFija={sala} isPending={isPending} error={error?.message}
      onSubmit={submit} onCancel={async () => { if (await confirmDiscard()) close(); }} />}
  </section>;
}
