/** Técnicas que puede analizar un proyecto; el docente elige cuáles (por defecto, las cinco). */
export const TECNICAS_PROYECTO = ['personas', 'journey-map', 'momentos-criticos', 'card-sorting', 'evaluacion-heuristica'] as const;
export type TecnicaProyecto = (typeof TECNICAS_PROYECTO)[number];
