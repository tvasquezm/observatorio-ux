import { useEffect, useState } from 'react';
import { useEvidenciaBlob } from '../hooks/useEvaluacionHeuristicaQueries';

interface Props {
  proyectoId: string;
  sesionId: string;
  evidenciaId: string;
  alt: string;
}

/** Miniatura de una captura. Abre la imagen completa en otra pestaña. */
export function EvidenciaImagen({ proyectoId, sesionId, evidenciaId, alt }: Props) {
  const { data: blob, isError, isLoading } = useEvidenciaBlob(proyectoId, sesionId, evidenciaId);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) return;
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  if (isLoading) return <p className="text-muted-xs">Cargando captura…</p>;
  if (isError || !url) return <p className="text-muted-xs">No se pudo cargar la captura.</p>;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="hx-thumb" aria-label={`Abrir captura: ${alt}`}>
      <img src={url} alt={alt} />
    </a>
  );
}
