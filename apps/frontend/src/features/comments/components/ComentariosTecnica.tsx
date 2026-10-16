import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TECNICAS_COMENTARIO } from '@observatorio-ux/shared-types';
import { ComentariosPanel } from './ComentariosPanel';

interface ComentariosTecnicaProps {
  proyectoId: string;
  // Clave de TECNICAS_COMENTARIO.
  tecnica: string;
}

export function ComentariosTecnica({ proyectoId, tecnica }: ComentariosTecnicaProps) {
  const [iniciado, setIniciado] = useState(false);
  const etiqueta = TECNICAS_COMENTARIO.find((t) => t.clave === tecnica)?.etiqueta ?? tecnica;

  return (
    <details className="comments-technique" onToggle={(event) => { if (event.currentTarget.open) setIniciado(true); }}>
      <summary>Comentarios de {etiqueta}</summary>
      {iniciado && (
        <>
          <ComentariosPanel proyectoId={proyectoId} filtro={tecnica} publicarEn={tecnica} />
          <Link to={`/proyectos/${proyectoId}/comentarios?tecnica=${encodeURIComponent(tecnica)}`}>
            Ver en Comentarios
          </Link>
        </>
      )}
    </details>
  );
}
