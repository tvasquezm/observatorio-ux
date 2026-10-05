// Tablas planas de cada vista de resultados. Una sola fuente para el CSV y el PDF.
import type { CardSortingAnalytics } from './api/card-sorting.api';
import { clusterPromedio, fusiones } from './card-sorting-cluster';
import type { CeldaCsv } from './card-sorting-csv';
import { fichasCategorias, filasTarjetas, type EstadoTarjeta } from './card-sorting-views';

export type VistaExportable = 'cards' | 'categories' | 'results' | 'popular' | 'similarity' | 'dendrogram' | 'participants' | 'answers';

export interface SegmentoBarra {
  pct: number;
  color: number;
}

export interface TablaVista {
  vista: VistaExportable;
  titulo: string;
  descripcion: string;
  columnas: string[];
  filas: CeldaCsv[][];
  // Matriz con una columna por categoría/tarjeta: el PDF la pone apaisada.
  ancha?: boolean;
  // Barras apiladas por fila (vista Tarjetas); el PDF las dibuja como última columna.
  barras?: SegmentoBarra[][];
}

export const TITULOS_VISTA: Record<VistaExportable, string> = {
  cards: 'Tarjetas',
  categories: 'Categorías',
  results: 'Matriz de ubicaciones',
  popular: 'Tarjetas populares',
  similarity: 'Similitud entre tarjetas',
  dendrogram: 'Dendrograma',
  participants: 'Participantes',
  answers: 'Respuestas',
};

const ESTADO: Record<EstadoTarjeta, string> = {
  consenso: 'Consenso',
  'sin-consenso': 'Sin consenso',
  'sin-datos': 'Sin datos',
};

function matriz(
  vista: VistaExportable,
  descripcion: string,
  encabezado: string,
  categorias: string[],
  filas: Array<{ tarjeta: string; valores: number[] }>,
): TablaVista {
  return {
    vista,
    titulo: TITULOS_VISTA[vista],
    descripcion,
    columnas: [encabezado, ...categorias],
    filas: filas.map((fila) => [fila.tarjeta, ...fila.valores]),
    ancha: categorias.length > 6,
  };
}

export function tablaDeVista(vista: VistaExportable, data: CardSortingAnalytics): TablaVista {
  switch (vista) {
    case 'cards': {
      const filas = filasTarjetas(data);
      return {
        vista,
        titulo: TITULOS_VISTA[vista],
        descripcion: `Categoría más elegida de cada tarjeta. Hay consenso cuando más del ${data.umbrales.consenso}% de los participantes la ubicó en la misma categoría.`,
        columnas: ['Tarjeta', 'Estado', 'Categoría principal', '% participantes', 'Participantes', 'Otras categorías'],
        filas: filas.map((fila) => [
          fila.tarjeta,
          ESTADO[fila.estado],
          fila.lider?.nombre ?? '',
          fila.lider ? fila.lider.pct : '',
          fila.lider ? fila.lider.frecuencia : '',
          fila.segmentos.slice(1).map((s) => `${s.nombre} ${s.pct}%`).join(' · '),
        ]),
        barras: filas.map((fila) => fila.segmentos.map((s) => ({ pct: s.pct, color: s.color }))),
      };
    }
    case 'categories':
      return {
        vista,
        titulo: TITULOS_VISTA[vista],
        descripcion: 'Tarjetas que contiene cada categoría y el porcentaje de participantes que la ubicó ahí.',
        columnas: ['Categoría', 'Subcategoría', 'Tarjeta', '% participantes', 'Participantes', 'Acuerdo'],
        filas: fichasCategorias(data).flatMap((ficha) => {
          const fila = (sub: string, c: { tarjeta: string; frecuencia: number; pct: number; bajoAcuerdo: boolean }): CeldaCsv[] =>
            [ficha.nombre, sub, c.tarjeta, c.pct, c.frecuencia, c.bajoAcuerdo ? 'Bajo acuerdo' : 'Consenso'];
          return [
            ...ficha.cartas.map((c) => fila('', c)),
            ...ficha.subcategorias.flatMap((sub) => sub.cartas.map((c) => fila(sub.nombre, c))),
          ];
        }),
      };
    case 'results':
      return matriz(vista, 'Cuántas veces cada tarjeta se ubicó en cada categoría.', 'Tarjeta (cantidad)', data.resultsMatrix.categorias, data.resultsMatrix.filas);
    case 'popular':
      return matriz(vista, 'Porcentaje de participantes que ubicó cada tarjeta en cada categoría.', 'Tarjeta (% participantes)', data.popularPlacementsMatrix.categorias, data.popularPlacementsMatrix.filas);
    case 'similarity':
      return matriz(
        vista,
        'Porcentaje de participantes que agrupó cada par de tarjetas en la misma categoría (100 = siempre juntas).',
        'Tarjeta (% similitud)',
        data.tarjetas,
        data.tarjetas.map((tarjeta, i) => ({ tarjeta, valores: data.matrizSimilitud[i] })),
      );
    case 'dendrogram': {
      const nombres = (indices: number[]) => indices.map((i) => data.tarjetas[i]).join(', ');
      return {
        vista,
        titulo: TITULOS_VISTA[vista],
        descripcion: 'Uniones sucesivas de grupos de tarjetas (enlace promedio), de la más similar a la menos similar.',
        columnas: ['Paso', 'Grupo A', 'Grupo B', 'Similitud al unirse (%)'],
        filas: fusiones(clusterPromedio(data.matrizSimilitud)).map((nodo) => [
          nodo.paso,
          nombres(nodo.izq!.tarjetas),
          nombres(nodo.der!.tarjetas),
          Math.round(100 - nodo.distancia),
        ]),
      };
    }
    case 'participants':
      return {
        vista,
        titulo: TITULOS_VISTA[vista],
        descripcion: 'Clasificación anónima de cada participante: una fila por grupo.',
        columnas: ['Participante', 'Categoría', 'Tarjetas'],
        filas: (data.participantes ?? []).flatMap((p) =>
          p.grupos.map((grupo) => [`Participante ${p.orden}`, grupo.categoria, grupo.tarjetas.join(' · ')]),
        ),
      };
    case 'answers':
      return {
        vista,
        titulo: TITULOS_VISTA[vista],
        descripcion: 'Respuestas anónimas a las preguntas del estudio.',
        columnas: ['Pregunta', 'Respuesta'],
        filas: (data.preguntas ?? []).flatMap((q) =>
          q.respuestas.length ? q.respuestas.map((r) => [q.texto, r]) : [[q.texto, '(sin respuestas)']],
        ),
      };
  }
}

export function resumenEstudio(data: CardSortingAnalytics): Array<[string, string]> {
  return [
    ['Participantes', String(data.participantesCount)],
    ['Tarjetas', String(data.cardsCount)],
    ['Categorías', String(data.categorias.length)],
    ['Acuerdo global', `${data.acuerdoGlobal}%`],
    ['Muestra', { baja: 'Baja', aceptable: 'Aceptable', estable: 'Estable' }[data.muestra]],
    ['Consenso', `> ${data.umbrales.consenso}% en una categoría`],
  ];
}

export function nombreArchivo(estudio: string, vista: string, extension: 'csv' | 'pdf'): string {
  const slug = estudio.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'estudio';
  return `card-sorting-${slug}-${vista}.${extension}`;
}

