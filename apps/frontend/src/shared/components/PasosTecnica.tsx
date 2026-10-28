import { Fragment, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface PasoTecnica {
  id: string;
  titulo: string;
  ayuda: string;
  contenido: ReactNode;
}

interface Props {
  pasos: PasoTecnica[];
  acciones?: ReactNode;
  /** Índice del primer paso donde `acciones` ya se muestra junto a "Siguiente" (por defecto, solo en el último). */
  accionesDesde?: number;
}

/** Todos los paneles quedan montados y ocultos: cambiar de paso conserva lo escrito. */
export function PasosTecnica({ pasos, acciones, accionesDesde }: Props) {
  const [indice, setIndice] = useState(0);
  const titulo = useRef<HTMLHeadingElement>(null);
  const ultimo = indice === pasos.length - 1;

  function ir(destino: number) {
    setIndice(destino);
    titulo.current?.focus();
  }

  return (
    <section className="tv-pasos" aria-label="Pasos de la técnica">
      <header className="tv-pasos-cabecera">
        <h4 ref={titulo} tabIndex={-1} className="tv-pasos-titulo">
          Paso {indice + 1} de {pasos.length}: {pasos[indice].titulo}
        </h4>
        <p className="tv-pasos-ayuda">{pasos[indice].ayuda}</p>
      </header>
      {pasos.map((paso, i) => (
        <div key={paso.id} hidden={i !== indice} className="tv-pasos-panel">
          {paso.contenido}
        </div>
      ))}
      <div className="tv-pasos-barra">
        <button type="button" className="secondary" disabled={indice === 0} onClick={() => ir(indice - 1)}>
          Anterior
        </button>
        {/* Con key distinta React no reutiliza el mismo <button>: si lo reutilizara, al pasar a
            type="submit" durante el clic de Siguiente el navegador enviaría el formulario. */}
        {!ultimo && (
          <button key="siguiente" type="button" className="primary" onClick={() => ir(indice + 1)}>
            Siguiente
          </button>
        )}
        {(ultimo || (accionesDesde !== undefined && indice >= accionesDesde)) && (
          <Fragment key="acciones">{acciones}</Fragment>
        )}
      </div>
    </section>
  );
}
