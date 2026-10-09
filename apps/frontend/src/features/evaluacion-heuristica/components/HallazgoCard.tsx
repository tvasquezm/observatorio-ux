import { esUrlHttp, etiquetaHeuristica } from '../heuristica-utils';
import type { HallazgoHeuristica } from '../api/evaluacion-heuristica.api';
import { EvidenciaImagen } from './EvidenciaImagen';
import { SeveridadBadge } from './SeveridadBadge';

interface Props {
  proyectoId: string;
  sesionId: string;
  hallazgo: HallazgoHeuristica;
  editable: boolean;
  onEditar: () => void;
  onEliminar: () => void;
}

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });

export function HallazgoCard({ proyectoId, sesionId, hallazgo: h, editable, onEditar, onEliminar }: Props) {
  const titulo = h.titulo || h.descripcion;
  return (
    <article className="finding rise hx-finding">
      <div className="finding-head">
        <SeveridadBadge valor={h.severidad} />
        <span className="chip">{etiquetaHeuristica(h.heuristicaId)}</span>
        {h.pantalla && <span className="text-muted-xs">Pantalla: {h.pantalla}</span>}
      </div>
      <h3>{titulo}</h3>
      {h.titulo && <p className="hx-desc">{h.descripcion}</p>}

      <div className="finding-grid">
        <div>
          <b>Evidencia</b>
          <p className="hx-text">{h.evidencia || '—'}</p>
          {h.evidenciaUrl && esUrlHttp(h.evidenciaUrl) && (
            <p className="hx-text">
              <a href={h.evidenciaUrl} target="_blank" rel="noopener noreferrer" className="hx-link">Ver enlace de evidencia</a>
            </p>
          )}
          {h.evidenciaArchivoId && (
            <EvidenciaImagen proyectoId={proyectoId} sesionId={sesionId} evidenciaId={h.evidenciaArchivoId} alt={`Captura: ${titulo}`} />
          )}
        </div>
        <div>
          <b>Recomendación</b>
          <p className="hx-text">{h.recomendacion || '—'}</p>
        </div>
      </div>

      <div className="finding-foot hx-foot">
        <span className="text-muted-xs hx-resp">
          Responsable: <strong>{h.responsable?.nombre ?? 'Sin registrar'}</strong> · {fecha(h.registradoEn)}
          {h.actualizadoEn ? ' · editado' : ''}
        </span>
        {editable && (
          <div className="row-gap-sm">
            <button type="button" className="text-button" onClick={onEditar} aria-label={`Editar hallazgo: ${titulo}`}>Editar</button>
            <button type="button" className="text-button text-button--danger" onClick={onEliminar} aria-label={`Eliminar hallazgo: ${titulo}`}>Eliminar</button>
          </div>
        )}
      </div>
    </article>
  );
}
