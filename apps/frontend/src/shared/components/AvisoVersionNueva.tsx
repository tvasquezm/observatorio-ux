import { useVersionNueva } from '../hooks/useVersionNueva';

/** Franja que invita a recargar cuando hay una versión nueva de la aplicación. */
export function AvisoVersionNueva() {
  const hayNueva = useVersionNueva();
  if (!hayNueva) return null;
  return (
    <div className="version-nueva" role="status">
      <span>Hay una versión nueva de la aplicación. Guarda lo que estés haciendo y actualiza para verla.</span>
      <button type="button" className="secondary" onClick={() => window.location.reload()}>Actualizar ahora</button>
    </div>
  );
}
