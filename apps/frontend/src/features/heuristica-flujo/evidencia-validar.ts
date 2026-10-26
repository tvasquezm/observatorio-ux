import { EVIDENCIA_MAX_BYTES, EVIDENCIA_MAX_MB } from '@observatorio-ux/shared-types';

export type MimeEvidencia = 'image/png' | 'image/jpeg' | 'image/webp';

const FORMATO_NO_PERMITIDO = 'Formato no permitido. Usa PNG, JPEG o WebP.';

/** Tamaño en MB con una decimal y coma (p. ej. 6,2). */
export const formatearMB = (bytes: number): string => (bytes / (1024 * 1024)).toFixed(1).replace('.', ',');

/** Lee solo los primeros bytes. FileReader porque File.arrayBuffer no existe en jsdom ni en navegadores antiguos. */
function leerCabecera(blob: Blob, bytes = 12): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(new Uint8Array(lector.result as ArrayBuffer));
    lector.onerror = () => reject(lector.error);
    lector.readAsArrayBuffer(blob.slice(0, bytes));
  });
}

/** Mismo criterio que detectarMimeImagen del backend; el servidor sigue siendo la autoridad. */
function mimeDesdeBytes(b: Uint8Array): MimeEvidencia | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'image/png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}

/** Tipo real por contenido; null si no es PNG, JPEG ni WebP, o si no se pudo leer. */
export async function detectarMimeEvidencia(blob: Blob): Promise<MimeEvidencia | null> {
  try { return mimeDesdeBytes(await leerCabecera(blob)); } catch { return null; }
}

/**
 * Devuelve el mensaje de error o null si la imagen es válida. Decide por contenido, no por el tipo declarado.
 * Antes de comprimir se usa con `omitirTamano`, porque una captura grande puede bajar de tamaño al comprimirla.
 */
export async function validarImagenEvidencia(file: File, opciones: { omitirTamano?: boolean } = {}): Promise<string | null> {
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) return 'No se aceptan imágenes SVG. Usa PNG, JPEG o WebP.';
  if (file.size === 0) return 'La imagen está vacía.';
  if (!opciones.omitirTamano && file.size > EVIDENCIA_MAX_BYTES) return `La imagen pesa ${formatearMB(file.size)} MB y supera el máximo de ${EVIDENCIA_MAX_MB} MB, incluso comprimida. Recórtala o divídela.`;
  const mime = await detectarMimeEvidencia(file);
  return mime ? null : FORMATO_NO_PERMITIDO;
}

/** Si el tipo declarado no coincide con el contenido (p. ej. una captura pegada sin tipo), reenvuelve el archivo con el tipo real. */
export async function normalizarTipoEvidencia(file: File): Promise<File> {
  const mime = await detectarMimeEvidencia(file);
  return mime && mime !== file.type ? new File([file], file.name, { type: mime }) : file;
}
