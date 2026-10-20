interface TechniqueNewButtonProps {
  etiqueta: string;
  abierto: boolean;
  puedeEditar: boolean;
  onClick: () => void;
  disabled?: boolean;
}

/** Único botón primario de la cabecera: crear, cancelar o indicar solo lectura. */
export function TechniqueNewButton({ etiqueta, abierto, puedeEditar, onClick, disabled }: TechniqueNewButtonProps) {
  if (!puedeEditar) return <span className="short-id">Solo lectura</span>;
  return (
    <button type="button" className={abierto ? 'secondary' : 'primary'} disabled={disabled} onClick={onClick}>
      {abierto ? 'Cancelar' : etiqueta}
    </button>
  );
}
