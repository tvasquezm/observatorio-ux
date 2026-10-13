import { describe, expect, it } from 'vitest';
import { agruparSecciones, SECCIONES_PROYECTO } from './project-sections';

describe('secciones del proyecto', () => {
  it('agrupa las secciones actuales en Proyecto y Técnicas, en orden de aparición', () => {
    const grupos = agruparSecciones(SECCIONES_PROYECTO);
    expect(grupos.map((g) => g.title)).toEqual(['Proyecto', 'Técnicas']);
    expect(grupos[1].items).toHaveLength(5);
  });

  it('un ítem con grupo nuevo crea su propio bloque sin tocar los demás', () => {
    const extra = { ...SECCIONES_PROYECTO[0], to: 'reportes', label: 'Reportes', group: 'Entregables' };
    const grupos = agruparSecciones([...SECCIONES_PROYECTO, extra]);
    expect(grupos.map((g) => g.title)).toEqual(['Proyecto', 'Técnicas', 'Entregables']);
    expect(grupos[2].items.map((i) => i.label)).toEqual(['Reportes']);
  });

  it('un grupo sin ítems visibles no se renderiza', () => {
    const soloProyecto = SECCIONES_PROYECTO.filter((i) => i.group === 'Proyecto');
    expect(agruparSecciones(soloProyecto).map((g) => g.title)).toEqual(['Proyecto']);
  });
});
