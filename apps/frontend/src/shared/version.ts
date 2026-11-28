declare const __APP_VERSION__: string | undefined;
declare const __APP_BUILD_DATE__: string | undefined;

/** Identificador de esta compilación (en desarrollo y en las pruebas no existe). */
export const VERSION_APP: string = typeof __APP_VERSION__ === 'undefined' ? 'desarrollo' : __APP_VERSION__;
export const FECHA_COMPILACION: string = typeof __APP_BUILD_DATE__ === 'undefined' ? '' : __APP_BUILD_DATE__;

/** Texto para mostrar en pantalla, por ejemplo «a1b2c3d · 2026-11-28». */
export const ETIQUETA_VERSION = FECHA_COMPILACION ? `${VERSION_APP} · ${FECHA_COMPILACION}` : VERSION_APP;
