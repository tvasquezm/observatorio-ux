export const SESSION_DURATION_PATTERN = /^[1-9]\d*(s|m|h|d)$/;

export function durationSeconds(value: string): number {
  if (!SESSION_DURATION_PATTERN.test(value)) throw new Error('La duración debe ser un entero positivo seguido de s, m, h o d.');
  const seconds = Number(value.slice(0, -1)) * ({ s: 1, m: 60, h: 3600, d: 86400 }[value.slice(-1)]!);
  if (!Number.isSafeInteger(seconds)) throw new Error('Duración fuera de rango.');
  return seconds;
}
