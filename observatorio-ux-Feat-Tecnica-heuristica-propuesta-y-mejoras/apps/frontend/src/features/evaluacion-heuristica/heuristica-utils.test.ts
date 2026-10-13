import { describe, expect, it } from 'vitest';
import type { HallazgoHeuristica } from './api/evaluacion-heuristica.api';
import {
  aInput,
  conteoPorSeveridad,
  esUrlHttp,
  etiquetaHeuristica,
  filtrarYOrdenar,
  formDesdeHallazgo,
  formVacio,
  nombreSesion,
  validarArchivoEvidencia,
  validarForm,
} from './heuristica-utils';

const valido = () => ({
  ...formVacio(),
  heuristicaId: 'H4' as const,
  titulo: 'Botón sin etiqueta',
  pantalla: 'Inscripción',
  descripcion: 'El botón de envío no tiene texto visible.',
  evidencia: 'Solo se ve un ícono.',
  recomendacion: 'Agregar la etiqueta "Enviar".',
});

const h = (id: string, severidad: HallazgoHeuristica['severidad'], heuristicaId: string, registradoEn: string): HallazgoHeuristica => ({
  id, severidad, heuristicaId, registradoEn, descripcion: 'd', evidencia: null, recomendacion: null,
});

describe('validarForm', () => {
  it('un formulario completo no tiene errores', () => {
    expect(validarForm(valido())).toEqual({});
  });

  it('el formulario vacío marca los 6 campos obligatorios', () => {
    expect(Object.keys(validarForm(formVacio())).sort()).toEqual(
      ['descripcion', 'evidencia', 'heuristicaId', 'pantalla', 'recomendacion', 'titulo'],
    );
  });

  it('rechaza enlaces que no son http(s), incluido javascript:', () => {
    expect(validarForm({ ...valido(), evidenciaUrl: 'javascript:alert(1)' }).evidenciaUrl).toBeDefined();
    expect(validarForm({ ...valido(), evidenciaUrl: 'ftp://x.cl/a' }).evidenciaUrl).toBeDefined();
    expect(validarForm({ ...valido(), evidenciaUrl: 'https://ejemplo.cl/captura' }).evidenciaUrl).toBeUndefined();
  });

  it('descripción de menos de 10 caracteres es inválida', () => {
    expect(validarForm({ ...valido(), descripcion: 'corta' }).descripcion).toBeDefined();
  });
});

describe('aInput / formDesdeHallazgo', () => {
  it('recorta textos y convierte enlace vacío en null', () => {
    const input = aInput({ ...valido(), titulo: '  Botón  ', evidenciaUrl: '  ' });
    expect(input.titulo).toBe('Botón');
    expect(input.evidenciaUrl).toBeNull();
  });

  it('un hallazgo legado (sin campos nuevos ni heurística del catálogo) abre el formulario sin romperse', () => {
    const f = formDesdeHallazgo(h('1', 3, 'consistencia', '2026-01-01'));
    expect(f.heuristicaId).toBe('');
    expect(f.titulo).toBe('');
    expect(f.evidenciaArchivoId).toBeNull();
  });
});

describe('filtrarYOrdenar / conteoPorSeveridad', () => {
  const lista = [
    h('a', 1, 'H1', '2026-01-03'),
    h('b', 4, 'H4', '2026-01-02'),
    h('c', 4, 'H1', '2026-01-01'),
    h('d', 3, 'H4', '2026-01-04'),
  ];

  it('ordena por severidad desc y, a igual severidad, por antigüedad', () => {
    expect(filtrarYOrdenar(lista, { severidad: 'todas', heuristica: 'todas' }).map((x) => x.id)).toEqual(['c', 'b', 'd', 'a']);
  });

  it('filtra por severidad y por heurística, y no muta la entrada', () => {
    const copia = [...lista];
    expect(filtrarYOrdenar(lista, { severidad: 4, heuristica: 'todas' }).map((x) => x.id)).toEqual(['c', 'b']);
    expect(filtrarYOrdenar(lista, { severidad: 'todas', heuristica: 'H4' }).map((x) => x.id)).toEqual(['b', 'd']);
    expect(filtrarYOrdenar(lista, { severidad: 4, heuristica: 'H4' }).map((x) => x.id)).toEqual(['b']);
    expect(lista).toEqual(copia);
  });

  it('cuenta por severidad 0..4', () => {
    expect(conteoPorSeveridad(lista)).toEqual([0, 1, 0, 1, 2]);
  });
});

describe('helpers', () => {
  it('esUrlHttp', () => {
    expect(esUrlHttp('https://a.cl')).toBe(true);
    expect(esUrlHttp('a.cl')).toBe(false);
    expect(esUrlHttp('data:text/html,<script>')).toBe(false);
  });

  it('validarArchivoEvidencia: formato y tamaño', () => {
    expect(validarArchivoEvidencia({ type: 'image/png', size: 1000 })).toBeNull();
    expect(validarArchivoEvidencia({ type: 'image/svg+xml', size: 1000 })).toMatch(/Formato/);
    expect(validarArchivoEvidencia({ type: 'image/png', size: 3 * 1024 * 1024 })).toMatch(/2 MB/);
  });

  it('etiquetaHeuristica usa el catálogo y tolera ids desconocidos', () => {
    expect(etiquetaHeuristica('H4')).toBe('H4 · Consistencia y estándares');
    expect(etiquetaHeuristica('otra')).toBe('otra');
  });

  it('nombreSesion no rotula como "Card Sorting" una sesión heurística legada', () => {
    expect(nombreSesion({ nombre: 'Portal', createdAt: '2026-10-01T00:00:00Z' })).toBe('Portal');
    expect(nombreSesion({ nombre: 'Card Sorting', createdAt: '2026-10-01T12:00:00Z' })).toMatch(/^Evaluación del /);
    expect(nombreSesion({ createdAt: '2026-10-01T12:00:00Z' })).toMatch(/^Evaluación del /);
  });
});
