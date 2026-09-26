// Fase 6 (docs/PLAN_REMEDIACION_AUDITORIA.md): prueba de carga del flujo
// real de un participante de Card Sorting — access -> consent -> join ->
// results — contra el estudio ya sembrado que se pase por env var.
//
// No crea datos: PROYECTO_ID y ESTUDIO_ID deben existir de antemano (un
// proyecto con un estudio maestro de Card Sorting sin cerrar).
//
// Los VUs corren desde una sola máquina y comparten IP real ante nginx.
// `limit_req` (deploy/nginx/default.conf) y el throttle global del backend
// (60/60s por IP — `join`/`results` no tienen @Throttle propio, a diferencia
// de `access`/`consent`/`token`) van a producir 429 esperables: es
// consistente con H1 (deuda técnica, topología de un solo salto) y este
// script lo mide, no lo evita.
//
// Uso:
//   BASE_URL=http://localhost \
//   PROYECTO_ID=<uuid> \
//   ESTUDIO_ID=<uuid> \
//   k6 run tests/load/participante.k6.js

import http from 'k6/http';
import { check, fail } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost';
const PROYECTO_ID = __ENV.PROYECTO_ID;
const ESTUDIO_ID = __ENV.ESTUDIO_ID;
const CONSENT_VERSION = __ENV.CONSENT_VERSION || '1.0';

if (!PROYECTO_ID || !ESTUDIO_ID) {
  fail('Faltan PROYECTO_ID y/o ESTUDIO_ID (env vars).');
}

const flowErrors = new Rate('flow_errors');
const joinDuration = new Trend('join_duration', true);
const resultsDuration = new Trend('results_duration', true);

export const options = {
  scenarios: {
    participante_flow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '30s', target: 120 },
        { duration: '1m', target: 200 },
        { duration: '2m', target: 200 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<800'],
    flow_errors: ['rate<0.05'],
  },
};

const jsonHeaders = { 'Content-Type': 'application/json' };

function step(res, label) {
  const ok = check(res, { [`${label}: status 2xx`]: (r) => r.status >= 200 && r.status < 300 });
  if (!ok) flowErrors.add(1);
  else flowErrors.add(0);
  return ok;
}

export default function () {
  // 1. access: crea al participante y devuelve access_token + resume_token.
  const accessRes = http.post(
    `${BASE_URL}/api/auth/participants/access`,
    JSON.stringify({ proyectoId: PROYECTO_ID }),
    { headers: jsonHeaders, tags: { name: 'access' } },
  );
  if (!step(accessRes, 'access')) return;
  const { participant, resume_token: resumeToken } = accessRes.json();

  // 2. consent: acceso abierto -> exige resumeToken, no código de invitación.
  const consentRes = http.post(
    `${BASE_URL}/api/auth/participants/consent`,
    JSON.stringify({
      participanteId: participant.id,
      proyectoId: PROYECTO_ID,
      aceptado: true,
      version: CONSENT_VERSION,
      resumeToken,
    }),
    { headers: jsonHeaders, tags: { name: 'consent' } },
  );
  if (!step(consentRes, 'consent')) return;

  // 3. token: emite el Bearer definitivo de participante.
  const tokenRes = http.post(
    `${BASE_URL}/api/auth/participants/token`,
    JSON.stringify({
      participanteId: participant.id,
      proyectoId: PROYECTO_ID,
      resumeToken,
    }),
    { headers: jsonHeaders, tags: { name: 'token' } },
  );
  if (!step(tokenRes, 'token')) return;
  const { access_token: bearer } = tokenRes.json();
  const authHeaders = { ...jsonHeaders, Authorization: `Bearer ${bearer}` };

  // 4. join: crea (o retoma) la sesión de participante y trae tarjetas/categorías.
  const joinRes = http.post(
    `${BASE_URL}/api/card-sorting/sessions/${ESTUDIO_ID}/join`,
    null,
    { headers: authHeaders, tags: { name: 'join' } },
  );
  joinDuration.add(joinRes.timings.duration);
  if (!step(joinRes, 'join')) return;
  const session = joinRes.json();

  const cards = session.cardsDefinidas || [];
  const categorias = session.categoriasDefinidas || [];
  if (cards.length === 0) {
    flowErrors.add(1);
    return;
  }

  // 5. results: arma los grupos. Si el estudio es cerrado (tiene categorías
  // predefinidas), reparte las tarjetas entre ellas; si es abierto, manda
  // todas las tarjetas en una única categoría nueva por nombre.
  let grupos;
  if (categorias.length > 0) {
    grupos = categorias.map((categoria, i) => ({
      categoriaId: categoria.id,
      cardIds: cards
        .filter((_, cardIndex) => cardIndex % categorias.length === i)
        .map((c) => c.id),
    })).filter((g) => g.cardIds.length > 0);
  } else {
    grupos = [
      {
        categoriaNombre: `Grupo carga VU ${__VU}`,
        cardIds: cards.map((c) => c.id),
      },
    ];
  }

  const resultsRes = http.post(
    `${BASE_URL}/api/card-sorting/sessions/${session.id}/results`,
    JSON.stringify({ grupos }),
    { headers: authHeaders, tags: { name: 'results' } },
  );
  resultsDuration.add(resultsRes.timings.duration);
  step(resultsRes, 'results');
}
