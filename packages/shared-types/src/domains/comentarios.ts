// Tecnicas que tienen seccion propia de comentarios. La clave coincide con la
// ruta de la tecnica dentro del proyecto. Un comentario sin tecnica es general.
export const TECNICAS_COMENTARIO = [
  { clave: 'personas', etiqueta: 'Personas' },
  { clave: 'journey-map', etiqueta: 'Journey Map' },
  { clave: 'momentos-criticos', etiqueta: 'Momentos críticos' },
  { clave: 'card-sorting', etiqueta: 'Card Sorting' },
  { clave: 'evaluacion-heuristica', etiqueta: 'Evaluación heurística' },
] as const;

export type TecnicaComentario = (typeof TECNICAS_COMENTARIO)[number]['clave'];

export const CLAVES_TECNICA_COMENTARIO: readonly string[] = TECNICAS_COMENTARIO.map((t) => t.clave);

// Valor del filtro `tecnica` que devuelve solo los comentarios generales.
export const FILTRO_COMENTARIO_GENERAL = 'general';
