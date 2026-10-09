// Secciones del menú de un proyecto. Para sumar una opción: agregar un ítem.
// Los grupos se derivan de los ítems (orden de primera aparición), así que un
// grupo nuevo aparece solo, sin tocar el layout ni el CSS.

import type { IconName } from '../shared/components/ui/Icon';

export interface SeccionProyecto {
  to: string;
  label: string;
  group: string;
  icon: IconName;
  end?: boolean;
  requires?: 'analitica' | 'participantes';
}

export const SECCIONES_PROYECTO: SeccionProyecto[] = [
  { to: '', label: 'Resumen', end: true, group: 'Proyecto', icon: 'resumen' },
  { to: 'personas', label: 'Personas', group: 'Técnicas', icon: 'personas' },
  { to: 'journey-map', label: 'Journey Map', group: 'Técnicas', icon: 'journey' },
  { to: 'momentos-criticos', label: 'Momentos críticos', group: 'Técnicas', icon: 'momentos' },
  { to: 'card-sorting', label: 'Card Sorting', group: 'Técnicas', icon: 'card-sorting' },
  { to: 'evaluacion-heuristica', label: 'Evaluación heurística', group: 'Técnicas', icon: 'heuristica' },
  { to: 'comentarios', label: 'Comentarios', group: 'Proyecto', icon: 'comentarios' },
  { to: 'analitica', label: 'Analítica', group: 'Proyecto', icon: 'analitica', requires: 'analitica' },
  { to: 'miembros', label: 'Miembros', group: 'Proyecto', icon: 'miembros' },
  { to: 'participantes', label: 'Participantes', group: 'Proyecto', icon: 'participantes', requires: 'participantes' },
];

export function agruparSecciones<T extends { group: string }>(items: T[]) {
  const grupos: { title: string; items: T[] }[] = [];
  for (const item of items) {
    const grupo = grupos.find((g) => g.title === item.group);
    if (grupo) grupo.items.push(item);
    else grupos.push({ title: item.group, items: [item] });
  }
  return grupos;
}
