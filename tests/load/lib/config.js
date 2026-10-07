import { sleep } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
export const FASE = __ENV.FASE || 'smoke';

const PAUSA_MIN = Number(__ENV.PAUSA_MIN ?? 3);
const PAUSA_MAX = Number(__ENV.PAUSA_MAX ?? 8);

if (!Number.isFinite(PAUSA_MIN) || !Number.isFinite(PAUSA_MAX) || PAUSA_MIN < 0 || PAUSA_MAX < PAUSA_MIN) {
  throw new Error('PAUSA_MIN y PAUSA_MAX deben ser segundos finitos, con 0 <= PAUSA_MIN <= PAUSA_MAX.');
}

export function pensar() {
  sleep(PAUSA_MIN + Math.random() * (PAUSA_MAX - PAUSA_MIN));
}

export function requerida(nombre) {
  const valor = __ENV[nombre];
  if (!valor) throw new Error(`Falta ${nombre} (env var).`);
  return valor;
}
