import { EVIDENCIA_MAX_BYTES, EVIDENCIA_MIME_PERMITIDOS } from '@observatorio-ux/shared-types';

const UMBRAL_OMITIR_BYTES = 500 * 1024;
const OBJETIVO_BYTES = 3 * 1024 * 1024;
const LADO_MAX_PX = 2560;
const PIXELES_MAX = 8_000_000;
const CALIDADES = [0.85, 0.7, 0.55];
const RONDAS_MAX = 4;
const FACTOR_REDUCCION = 0.75;

function aBlob(canvas: HTMLCanvasElement, tipo: string, calidad: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, tipo, calidad));
}

async function codificar(canvas: HTMLCanvasElement, calidad: number): Promise<Blob | null> {
  const webp = await aBlob(canvas, 'image/webp', calidad);
  if (webp && webp.type === 'image/webp') return webp;
  // Algunos navegadores no codifican WebP y devuelven PNG: se usa JPEG.
  return aBlob(canvas, 'image/jpeg', calidad);
}

function nombreConExtension(nombre: string, tipo: string): string {
  const base = nombre.replace(/\.[^./\\]+$/, '') || 'captura';
  return `${base}.${tipo === 'image/webp' ? 'webp' : 'jpg'}`;
}

/**
 * Reduce capturas pesadas en el navegador antes de subirlas. Nunca lanza: ante
 * cualquier fallo devuelve el archivo original y la validacion de tamano
 * decide. El servidor revalida siempre.
 */
export async function comprimirImagen(archivo: File): Promise<File> {
  if (!(EVIDENCIA_MIME_PERMITIDOS as readonly string[]).includes(archivo.type)) return archivo;
  if (archivo.size <= UMBRAL_OMITIR_BYTES) return archivo;
  if (typeof createImageBitmap !== 'function') return archivo;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(archivo);
  } catch {
    return archivo;
  }

  try {
    let escala = Math.min(
      1,
      LADO_MAX_PX / Math.max(bitmap.width, bitmap.height),
      Math.sqrt(PIXELES_MAX / (bitmap.width * bitmap.height)),
    );
    let mejor: Blob | null = null;
    for (let ronda = 0; ronda < RONDAS_MAX; ronda += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * escala));
      canvas.height = Math.max(1, Math.round(bitmap.height * escala));
      const ctx = canvas.getContext('2d');
      if (!ctx) return archivo;
      // Fondo blanco: evita fondo negro si el navegador cae a JPEG.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const calidad of CALIDADES) {
        const blob = await codificar(canvas, calidad);
        if (!blob) return archivo;
        if (!mejor || blob.size < mejor.size) mejor = blob;
        if (blob.size <= OBJETIVO_BYTES) return elegir(archivo, blob);
      }
      escala *= FACTOR_REDUCCION;
    }
    return mejor && mejor.size <= EVIDENCIA_MAX_BYTES ? elegir(archivo, mejor) : archivo;
  } catch {
    return archivo;
  } finally {
    bitmap.close();
  }
}

function elegir(original: File, blob: Blob): File {
  if (original.size <= OBJETIVO_BYTES && blob.size >= original.size) return original;
  return new File([blob], nombreConExtension(original.name, blob.type), { type: blob.type });
}
