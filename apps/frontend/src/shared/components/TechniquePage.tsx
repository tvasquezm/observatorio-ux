import type { ReactNode } from 'react';

interface TechniquePageProps {
  cabecera: ReactNode;
  proceso?: ReactNode;
  resumen?: ReactNode;
  formulario?: ReactNode;
  lista?: ReactNode;
  comentarios?: ReactNode;
  className?: string;
}

/**
 * Esqueleto común de las técnicas. El orden de las secciones lo fija este
 * componente (cabecera con instrucciones, proceso, resumen, formulario, lista,
 * comentarios): una página no puede reordenarlas. Los slots vacíos no se pintan.
 */
export function TechniquePage({
  cabecera,
  proceso,
  resumen,
  formulario,
  lista,
  comentarios,
  className,
}: TechniquePageProps) {
  return (
    <div className={`artifact-page technique-page${className ? ` ${className}` : ''}`}>
      {cabecera}
      {proceso}
      {resumen}
      {formulario}
      {lista}
      {comentarios}
    </div>
  );
}
