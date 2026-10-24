interface TechniqueItemActionsProps {
  onConsultar?: () => void;
  onEditar?: () => void;
  onEliminar?: () => void;
  consultando?: boolean;
  eliminando?: boolean;
  disabled?: boolean;
  etiquetaConsultar?: string;
}

/** Acciones de un elemento de lista, siempre en el mismo orden: Consultar, Editar, Eliminar. */
export function TechniqueItemActions({
  onConsultar,
  onEditar,
  onEliminar,
  consultando = false,
  eliminando = false,
  disabled = false,
  etiquetaConsultar = 'Consultar',
}: TechniqueItemActionsProps) {
  return (
    <div className="technique-item-actions">
      {onConsultar && (
        <button type="button" className="secondary" disabled={disabled} onClick={onConsultar}>
          {consultando ? 'Cerrar' : etiquetaConsultar}
        </button>
      )}
      {onEditar && (
        <button type="button" className="secondary" disabled={disabled} onClick={onEditar}>
          Editar
        </button>
      )}
      {onEliminar && (
        <button type="button" className="danger" disabled={disabled} onClick={onEliminar}>
          {eliminando ? 'Eliminando…' : 'Eliminar'}
        </button>
      )}
    </div>
  );
}
