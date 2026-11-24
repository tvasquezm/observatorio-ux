// Comprobación de paginación para los tests. pdfmake no avisa cuando corta contenido:
// un bloque «unbreakable», una imagen o un SVG más alto que el área útil de la hoja se
// dibuja igual y lo que sobra queda fuera de la página. Aquí se mide cada uno de esos
// bloques en una hoja muy alta (con el mismo ancho útil) y se compara con el alto útil real.
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';

export interface BloqueCortado { bloque: string; alto: number; altoUtil: number }

type Nodo = Record<string, unknown>;
type InfoNodo = { id?: string; startPosition?: { top: number; pageNumber: number } };

const A4 = { ancho: 595.28, alto: 841.89 };
const HOJA_ALTA = 50_000;

/** Copia profunda que conserva funciones (layouts de tabla, encabezado, pie). */
function clonar(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(clonar);
  if (!valor || typeof valor !== 'object') return valor;
  return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, clonar(v)]));
}

/** Bloques que deben caber enteros en una hoja: stacks unbreakable, imágenes y SVG fuera de tablas. */
function bloquesEnteros(valor: unknown, encontrados: Nodo[], enTabla = false): void {
  if (Array.isArray(valor)) { valor.forEach(v => bloquesEnteros(v, encontrados, enTabla)); return; }
  if (!valor || typeof valor !== 'object') return;
  const nodo = valor as Nodo;
  if (!enTabla && ((nodo.unbreakable && Array.isArray(nodo.stack)) || nodo.image || nodo.svg)) { encontrados.push(nodo); return; }
  for (const clave of ['stack', 'columns', 'ul', 'ol']) if (clave in nodo) bloquesEnteros(nodo[clave], encontrados, enTabla);
  if (nodo.table && typeof nodo.table === 'object') bloquesEnteros((nodo.table as Nodo).body, encontrados, true);
}

const marca = (id: string) => ({ text: ' ', fontSize: 1, lineHeight: 1, id });

async function renderizar(def: TDocumentDefinitions) {
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const vfs = await import('pdfmake/build/vfs_fonts');
  const pdfMake = ((pdfMakeModule as unknown as { default?: unknown }).default ?? pdfMakeModule) as { addVirtualFileSystem: (v: unknown) => void; createPdf: (d: TDocumentDefinitions) => { getBuffer: () => Promise<Uint8Array> } };
  pdfMake.addVirtualFileSystem((vfs as unknown as { default?: unknown }).default ?? vfs);
  await pdfMake.createPdf({ ...def, defaultStyle: { ...def.defaultStyle, font: 'Roboto' } }).getBuffer();
}

/** Devuelve los bloques que no caben enteros en una hoja de la definición (A4). */
export async function bloquesQueNoCaben(definicion: TDocumentDefinitions): Promise<{ revisados: number; cortados: BloqueCortado[] }> {
  const apaisada = definicion.pageOrientation === 'landscape';
  const [mIzq, mArr, mDer, mAba] = (definicion.pageMargins ?? [40, 40, 40, 40]) as number[];
  const ancho = apaisada ? A4.alto : A4.ancho;
  const altoUtil = (apaisada ? A4.ancho : A4.alto) - mArr - mAba;
  const bloques: Nodo[] = [];
  bloquesEnteros(clonar(definicion.content), bloques);
  const posiciones = new Map<string, { top: number; pageNumber: number }>();
  await renderizar({
    pageSize: { width: ancho, height: HOJA_ALTA }, pageMargins: [mIzq, 0, mDer, 0],
    defaultStyle: definicion.defaultStyle, styles: definicion.styles, images: definicion.images,
    content: bloques.flatMap((b, i) => [marca(`ini-${i}`), { ...b, unbreakable: false, pageBreak: undefined } as Content, marca(`fin-${i}`)]),
    pageBreakBefore: ((nodo: InfoNodo) => { if (nodo.id && nodo.startPosition) posiciones.set(nodo.id, nodo.startPosition); return false; }) as never,
  });
  const cortados: BloqueCortado[] = [];
  bloques.forEach((b, i) => {
    const ini = posiciones.get(`ini-${i}`), fin = posiciones.get(`fin-${i}`);
    if (!ini || !fin) return;
    const alto = fin.pageNumber === ini.pageNumber ? fin.top - ini.top - 1.2 : Infinity;
    if (alto > altoUtil) cortados.push({ bloque: JSON.stringify(b).slice(0, 80), alto: Math.round(alto), altoUtil: Math.round(altoUtil) });
  });
  // El documento real también debe generarse sin errores.
  await renderizar(definicion);
  return { revisados: bloques.length, cortados };
}
