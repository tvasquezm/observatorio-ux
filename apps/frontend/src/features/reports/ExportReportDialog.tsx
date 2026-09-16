import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listProjects } from '../projects/api/projects.api';
import { loadProjectReport, REPORT_METHODS, type ReportMethod } from './report-data';
import { notify } from '../../shared/api/toast';

export function ExportReportDialog({ projectId, onClose }: { projectId?: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const projectRef = useRef<HTMLSelectElement>(null);
  const titleId = useId();
  const helpId = useId();
  const selectId = useId();
  const statusId = useId();
  const [selectedProject, setSelectedProject] = useState(projectId ?? '');
  const [selection, setSelection] = useState<ReportMethod[]>(REPORT_METHODS.map(({ id }) => id));
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const projects = useQuery({ queryKey: ['report-projects'], queryFn: listProjects, staleTime: 0 });

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.showModal();
    projectRef.current?.focus();
    return () => { dialog?.close(); previousFocus?.focus(); };
  }, []);

  async function download() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const [report, { exportarReportePdf }] = await Promise.all([
        loadProjectReport(selectedProject, selection),
        import('../../shared/utils/pdf'),
      ]);
      await exportarReportePdf(report);
      notify.success('Informe PDF descargado.');
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos generar el informe. Inténtalo nuevamente.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="report-dialog" aria-labelledby={titleId} aria-describedby={helpId}
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
      <div className="report-brand">
        <img src="/brand/uxlab-observatorio-white.webp" alt="UXLab Observatorio, experiencia usuaria" width="212" height="53" />
      </div>
      <h2 id={titleId}>Descargar PDF</h2>
      <p id={helpId}>Selecciona las técnicas que quieres incluir en el informe de tu proyecto.</p>
      <form aria-busy={busy} onSubmit={(event) => { event.preventDefault(); void download(); }}>
        <fieldset disabled={busy} className="report-project">
          <label htmlFor={selectId}>Proyecto</label>
          <select ref={projectRef} id={selectId} required value={selectedProject} onChange={(event) => setSelectedProject(event.target.value)}>
            <option value="">{projects.isPending ? 'Cargando proyectos…' : 'Selecciona un proyecto'}</option>
            {projects.data?.map((project) => <option key={project.id} value={project.id}>{project.nombre}</option>)}
          </select>
          {projects.isError && <p role="alert">No pudimos cargar los proyectos. <button type="button" onClick={() => void projects.refetch()}>Reintentar</button></p>}
          {projects.data?.length === 0 && <p>No tienes proyectos disponibles para exportar.</p>}
        </fieldset>
        <fieldset disabled={busy} className="report-selection">
          <legend>Técnicas que se incluirán</legend>
          <div className="report-select-actions">
            <button type="button" onClick={() => setSelection(REPORT_METHODS.map(({ id }) => id))}>Informe completo</button>
            <button type="button" onClick={() => setSelection([])}>Quitar todas</button>
          </div>
          {REPORT_METHODS.map(({ id, label, detail }) => (
            <label key={id} className="report-option">
              <input type="checkbox" checked={selection.includes(id)} onChange={(event) => setSelection((current) => event.target.checked ? [...current, id] : current.filter((value) => value !== id))} />
              <span><strong>{label}</strong><small>{detail}</small></span>
            </label>
          ))}
        </fieldset>
        <p className="report-note">Incluye datos guardados del proyecto y las evaluaciones accesibles para tu cuenta.</p>
        <p id={statusId} role="status" className="report-status">{busy ? 'Preparando los datos y generando el PDF…' : !selectedProject ? 'Selecciona un proyecto para descargar.' : !selection.length ? 'Selecciona al menos una técnica para descargar.' : `${selection.length} de 5 técnicas seleccionadas`}</p>
        {error && <p role="alert" className="report-error">{error}</p>}
        <div className="report-actions">
          <button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary" aria-describedby={statusId} disabled={busy || !selection.length || !projects.data?.some(({ id }) => id === selectedProject)}>{busy ? 'Generando…' : 'Descargar PDF'}</button>
        </div>
      </form>
    </dialog>
  );
}
