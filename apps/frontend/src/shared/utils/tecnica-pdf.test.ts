import { describe, expect, it } from 'vitest';
import { TECNICAS_INFO, type TecnicaId } from '../content/tecnicas-info';
import { buildExplicacionPdfDefinition } from './tecnica-pdf';

describe('PDF de explicación', () => {
  it('no comparte la lista de pasos que el generador de PDF normaliza al renderizar', () => {
    const pasos = TECNICAS_INFO.personas.explicacionCompleta.secciones.find(s => s.pasos)!.pasos!;
    const original = [...pasos];
    const pdf = buildExplicacionPdfDefinition('personas');
    const lista = (pdf.content as Array<{ ol?: unknown[] }>).find(item => item.ol)!.ol!;
    lista[0] = { text: 'Paso normalizado por pdfmake' };
    expect(pasos).toEqual(original);
  });
  it.each(Object.keys(TECNICAS_INFO) as TecnicaId[])('usa el contenido completo de %s con tamaño propio', tecnica => {
    const info = TECNICAS_INFO[tecnica].explicacionCompleta;
    const pdf = buildExplicacionPdfDefinition(tecnica);
    const texto = JSON.stringify(pdf.content);
    for (const seccion of info.secciones) {
      expect(texto).toContain(seccion.encabezado);
      for (const parrafo of [...(seccion.parrafos ?? []), ...(seccion.pasos ?? [])]) expect(texto).toContain(parrafo);
    }
    expect(pdf.defaultStyle?.fontSize).toBe(11);
  });
});
