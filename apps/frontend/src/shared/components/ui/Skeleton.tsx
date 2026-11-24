// Esqueleto de carga: formas grises con un brillo que avanza mientras llegan los datos.
// El texto de `etiqueta` queda para lectores de pantalla (y para los tests); lo visual es decorativo.

export type VarianteSkeleton = 'lista' | 'tarjetas' | 'panel' | 'texto' | 'pantalla';

interface SkeletonProps {
  /** Qué se está cargando, p. ej. «Cargando proyectos…». */
  etiqueta: string;
  variante?: VarianteSkeleton;
  /** Cantidad de filas o tarjetas. */
  cantidad?: number;
  className?: string;
}

const Linea = ({ ancho }: { ancho: string }) => <span className="skeleton-forma skeleton-linea" style={{ width: ancho }} />;
const ANCHOS = ['92%', '78%', '85%', '64%', '88%', '72%'];

function Formas({ variante, cantidad }: { variante: VarianteSkeleton; cantidad: number }) {
  const n = Array.from({ length: cantidad }, (_, i) => i);
  switch (variante) {
    case 'tarjetas':
      return <div className="skeleton-tarjetas">{n.map(i => (
        <div key={i} className="skeleton-tarjeta">
          <span className="skeleton-forma skeleton-icono" />
          <Linea ancho="70%" /><Linea ancho="95%" /><Linea ancho="55%" />
        </div>
      ))}</div>;
    case 'lista':
      return <div className="skeleton-lista">{n.map(i => (
        <div key={i} className="skeleton-fila">
          <span className="skeleton-forma skeleton-avatar" />
          <div><Linea ancho={ANCHOS[i % ANCHOS.length]} /><Linea ancho="40%" /></div>
        </div>
      ))}</div>;
    case 'texto':
      return <div className="skeleton-texto">{n.map(i => <Linea key={i} ancho={ANCHOS[i % ANCHOS.length]} />)}</div>;
    case 'pantalla':
      return <div className="skeleton-pantalla">
        <Linea ancho="22%" /><span className="skeleton-forma skeleton-titulo" />
        <div className="skeleton-tarjetas">{[0, 1, 2].map(i => <div key={i} className="skeleton-tarjeta"><Linea ancho="60%" /><Linea ancho="90%" /><Linea ancho="45%" /></div>)}</div>
      </div>;
    default:
      return <div className="skeleton-panel">
        <span className="skeleton-forma skeleton-titulo" />
        {n.map(i => <Linea key={i} ancho={ANCHOS[i % ANCHOS.length]} />)}
      </div>;
  }
}

export function Skeleton({ etiqueta, variante = 'panel', cantidad = 3, className }: SkeletonProps) {
  return (
    <div className={`skeleton skeleton--${variante}${className ? ` ${className}` : ''}`} role="status" aria-label={etiqueta} aria-busy="true">
      <span className="sr-only">{etiqueta}</span>
      <div aria-hidden="true"><Formas variante={variante} cantidad={cantidad} /></div>
    </div>
  );
}
