// CSV de resultados del card sorting. Una celda de texto que empieza con
// = + - @ (o tab / retorno de carro) la interpreta Excel/Sheets como fórmula:
// se neutraliza con un apóstrofo al inicio. Los números no se tocan.
// Separador ';': Excel con configuración regional de coma decimal (es-CL, es-ES)
// espera punto y coma; con ',' suele abrir todo en una sola columna.
export type CeldaCsv = string | number;

const SEPARADOR = ';';
const INICIO_FORMULA = /^[=+\-@\t\r]/;

export function escaparCeldaCsv(valor: CeldaCsv): string {
  let texto = String(valor);
  if (typeof valor === 'string' && INICIO_FORMULA.test(texto)) texto = `'${texto}`;
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function generarCsv(filas: CeldaCsv[][]): string {
  return filas.map((fila) => fila.map(escaparCeldaCsv).join(SEPARADOR)).join('\r\n');
}

export function tablaACsv(tabla: { columnas: string[]; filas: CeldaCsv[][] }): string {
  return generarCsv([tabla.columnas, ...tabla.filas]);
}

interface MatrizCsv {
  categorias: string[];
  filas: Array<{ tarjeta: string; valores: number[] }>;
}

// Primera columna = tarjeta; luego una columna por categoría (o por tarjeta
// en la matriz de similitud).
export function matrizACsv(matriz: MatrizCsv, encabezado = 'Tarjeta'): string {
  return generarCsv([
    [encabezado, ...matriz.categorias],
    ...matriz.filas.map((fila) => [fila.tarjeta, ...fila.valores]),
  ]);
}

export function similitudACsv(tarjetas: string[], similitud: number[][]): string {
  return matrizACsv(
    { categorias: tarjetas, filas: tarjetas.map((tarjeta, i) => ({ tarjeta, valores: similitud[i] })) },
  );
}

// BOM para que Excel abra bien las tildes.
export function descargarCsv(nombreArchivo: string, contenido: string): void {
  const blob = new Blob(['\uFEFF', contenido], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
