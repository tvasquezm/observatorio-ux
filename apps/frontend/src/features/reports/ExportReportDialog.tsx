import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listProjects } from '../projects/api/projects.api';
import { useAuthStore } from '../auth/store/useAuthStore';
import { listarLienzos, loadProjectReport, normalizarPartes, PLANTILLAS_INFORME, REPORT_METHODS, type ReportLienzos, type ReportMethod, type ReportParts } from './report-data';
import { TecnicaAcordeon } from './TecnicaAcordeon';
import { notify } from '../../shared/api/toast';

interface EleccionGuardada { selection: ReportMethod[]; partes: ReportParts }

/** Última elección de contenido por proyecto, en este navegador. Sin almacenamiento, el diálogo parte con todo. */
const claveEleccion = (userId: string, proyecto: string) => `observatorio-ux-export:${userId}:${proyecto}`;
function leerEleccion(clave: string): EleccionGuardada | null {
  try {
    const valor = JSON.parse(localStorage.getItem(clave) ?? 'null') as EleccionGuardada | null;
    if (!valor || !Array.isArray(valor.selection)) return null;
    const ids = REPORT_METHODS.map(m => m.id) as string[];
    const partes = Object.fromEntries(Object.entries(valor.partes ?? {}).map(([m, p]) => [m, normalizarPartes(m as ReportMethod, p)]));
    return { selection: valor.selection.filter(id => ids.includes(id)), partes };
  } catch { return null; }
}
function guardarEleccion(clave: string, eleccion: EleccionGuardada) {
  try { localStorage.setItem(clave, JSON.stringify(eleccion)); } catch { /* sin almacenamiento: no se recuerda */ }
}

export function ExportReportDialog({ projectId, onClose }: { projectId?: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const projectRef = useRef<HTMLSelectElement>(null);
  const titleId = useId();
  const helpId = useId();
  const selectId = useId();
  const statusId = useId();
  const userId = useAuthStore(state => state.user?.id) ?? 'anonymous';
  // Proyecto de la página actual o, si no, el proyecto activo elegido en Inicio.
  const [selectedProject, setSelectedProject] = useState(() => {
    if (projectId) return projectId;
    try { return sessionStorage.getItem(`observatorio-ux-project:${userId}`) ?? ''; } catch { return ''; }
  });
  const [selection, setSelection] = useState<ReportMethod[]>(REPORT_METHODS.map(({ id }) => id));
  const [partes, setPartes] = useState<ReportParts>({});
  const [lienzos, setLienzos] = useState<ReportLienzos>({});
  const [plantilla, setPlantilla] = useState<string | null>('completo');
  /** Solo una técnica desplegada a la vez (F39). */
  const [abierta, setAbierta] = useState<ReportMethod | null>(null);
  // Una técnica sin apartados o sin lienzos elegidos no entra al PDF.
  const incluidas = selection.filter(id => partes[id]?.length !== 0 && lienzos[id]?.length !== 0);
  const apartados = REPORT_METHODS.filter(m => incluidas.includes(m.id)).reduce((total, m) => total + (partes[m.id]?.length ?? m.partes.length), 0);
  const seleccionesParciales = REPORT_METHODS.some(method =>
    selection.includes(method.id) && (partes[method.id]?.length ?? method.partes.length) < method.partes.length,
  );
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const projects = useQuery({ queryKey: ['report-projects'], queryFn: listProjects, staleTime: 0 });
  const disponibles = useQuery({ queryKey: ['report-lienzos', selectedProject], queryFn: () => listarLienzos(selectedProject), enabled: !!selectedProject, staleTime: 0, retry: false });

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.showModal();
    projectRef.current?.focus();
    return () => { dialog?.close(); previousFocus?.focus(); };
  }, []);

  // Con un solo proyecto, o si el recordado ya no existe, se ajusta solo.
  useEffect(() => {
    if (!projects.data) return;
    if (selectedProject && !projects.data.some(p => p.id === selectedProject)) setSelectedProject('');
    else if (!selectedProject && projects.data.length === 1) setSelectedProject(projects.data[0].id);
  }, [projects.data, selectedProject]);

  // Al cambiar de proyecto se recupera la última elección hecha para él.
  useEffect(() => {
    if (!selectedProject) return;
    const guardada = leerEleccion(claveEleccion(userId, selectedProject));
    if (!guardada) return;
    setSelection(guardada.selection);
    setPartes(guardada.partes);
    setPlantilla(null);
  }, [selectedProject, userId]);

  function aplicarPlantilla(id: string) {
    const elegida = PLANTILLAS_INFORME.find(p => p.id === id);
    if (!elegida) return;
    setSelection([...elegida.selection]);
    setPartes({ ...elegida.partes });
    setLienzos({});
    setAbierta(null);
    setPlantilla(id);
  }

  async function download() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const [report, { exportarReportePdf }] = await Promise.all([
        loadProjectReport(selectedProject, incluidas, partes, lienzos),
        import('../../shared/utils/pdf'),
      ]);
      await exportarReportePdf(report);
      guardarEleccion(claveEleccion(userId, selectedProject), { selection, partes });
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
    <dialog ref={dialogRef} className="report-dialog report-dialog--export" aria-labelledby={titleId} aria-describedby={helpId}
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
      <div className="report-brand">
        <img src="/brand/uxlab-observatorio-white.webp" alt="UXLab Observatorio, experiencia usuaria" width="212" height="53" />
      </div>
      <h2 id={titleId}>Descargar PDF</h2>
      <p id={helpId}>Elige una plantilla o ajusta las técnicas y apartados que quieres incluir en el informe de tu proyecto.</p>
      <form aria-busy={busy} onSubmit={(event) => { event.preventDefault(); void download(); }}>
        <fieldset disabled={busy} className="report-project">
          <label htmlFor={selectId}>Proyecto</label>
          <select ref={projectRef} id={selectId} required value={selectedProject} onChange={(event) => { setSelectedProject(event.target.value); setLienzos({}); }}>
            <option value="">{projects.isPending ? 'Cargando proyectos…' : 'Selecciona un proyecto'}</option>
            {projects.data?.map((project) => <option key={project.id} value={project.id}>{project.nombre}</option>)}
          </select>
          {projects.isError && <p role="alert">No pudimos cargar los proyectos. <button type="button" onClick={() => void projects.refetch()}>Reintentar</button></p>}
          {projects.data?.length === 0 && <p>No tienes proyectos disponibles para exportar.</p>}
        </fieldset>
        <fieldset disabled={busy} className="report-plantillas">
          <legend>Plantilla</legend>
          <div className="report-plantillas-lista">
            {PLANTILLAS_INFORME.map(p => (
              <button key={p.id} type="button" className="report-plantilla" aria-pressed={plantilla === p.id} onClick={() => aplicarPlantilla(p.id)}>
                <strong>{p.label}</strong><small>{p.descripcion}</small>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset disabled={busy} className="report-selection">
          <legend>Técnicas que se incluirán</legend>
          <div className="report-select-actions">
            <button type="button" onClick={() => { setSelection([]); setPartes({}); setLienzos({}); setAbierta(null); setPlantilla(null); }}>Quitar todas</button>
          </div>
          {REPORT_METHODS.map(({ id, label, detail, partes: opciones }) => (
            <TecnicaAcordeon key={id} id={id} label={label} detail={detail} opciones={opciones}
              incluida={selection.includes(id)} abierta={abierta === id}
              partes={partes[id] ?? opciones.map(opcion => opcion.id)}
              onIncluir={incluir => { setPlantilla(null); setSelection(current => incluir ? [...current, id] : current.filter(value => value !== id)); setAbierta(incluir ? id : abierta === id ? null : abierta); }}
              onAbrir={abrir => setAbierta(abrir ? id : null)}
              onPartes={ids => { setPlantilla(null); setPartes(current => ({ ...current, [id]: ids })); }}
              lienzos={disponibles.data?.[id]} lienzosElegidos={lienzos[id]}
              onLienzos={ids => { setPlantilla(null); setLienzos(current => ({ ...current, [id]: ids })); }} />
          ))}
        </fieldset>
        <p className="report-note">Incluye datos guardados del proyecto y las evaluaciones accesibles para tu cuenta. Tu elección se recuerda para la próxima vez.</p>
        <p id={statusId} role="status" className="report-status">{busy ? 'Preparando los datos y generando el PDF…' : !selectedProject ? 'Selecciona un proyecto para descargar.' : !incluidas.length ? 'Selecciona al menos una técnica para descargar.' : `${incluidas.length} de 5 técnicas seleccionadas · ${apartados} apartados${seleccionesParciales ? ' · Hay partes sin incluir.' : ''}`}</p>
        {error && <p role="alert" className="report-error">{error}</p>}
        <div className="report-actions">
          <button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary" aria-describedby={statusId} disabled={busy || !incluidas.length || !projects.data?.some(({ id }) => id === selectedProject)}>{busy ? 'Generando…' : 'Descargar PDF'}</button>
        </div>
      </form>
    </dialog>
  );
}
