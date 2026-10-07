// Flujo de EVALUADOR (cookie evaluadorToken + CSRF) y de ADMIN. Login una
// sola vez en setup() — /auth/login tiene tope de 5/min por IP — y la cookie
// se reenvía a mano en cada request. Todos los VUs usan la misma cuenta.
//
// Requiere el seed: PROYECTO_ID = proyecto demo del profesor (tiene artefactos).
//
// Uso:
//   FASE=smoke|baseline|load|stress|spike|soak \
//   BASE_URL=http://localhost:8080 \
//   PROYECTO_ID=f1e1b6a1-0001-4a11-9c00-000000000002 \
//   EVAL_EMAIL=<email> EVAL_PASSWORD=<password> \
//   k6 run tests/load/evaluador.k6.js

import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, FASE, pensar, requerida } from './lib/config.js';
import { etapas, umbrales } from './lib/fases.js';
import { flowErrors } from './lib/metricas.js';

const PROYECTO_ID = requerida('PROYECTO_ID');

export const options = {
  discardResponseBodies: true,
  scenarios: {
    evaluador: {
      executor: 'ramping-vus',
      exec: 'evaluador',
      startVUs: 0,
      stages: etapas(FASE),
    },
  },
  thresholds: { ...umbrales(FASE), flow_errors: ['rate<0.05'] },
};

function login(email, password) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' }, jar: new http.CookieJar() },
  );
  const token = res.cookies.evaluadorToken && res.cookies.evaluadorToken[0];
  const csrf = res.cookies.csrfToken && res.cookies.csrfToken[0];
  if (res.status < 200 || res.status >= 300 || !token || !csrf) {
    throw new Error(`Login falló para ${email}: HTTP ${res.status}.`);
  }
  return { token: token.value, csrf: csrf.value };
}

export function setup() {
  const datos = { evaluador: login(requerida('EVAL_EMAIL'), requerida('EVAL_PASSWORD')) };
  if (__ENV.ADMIN_EMAIL && __ENV.ADMIN_PASSWORD) {
    datos.admin = login(__ENV.ADMIN_EMAIL, __ENV.ADMIN_PASSWORD);
  }
  return datos;
}

function cabeceras(sesion, mutante = false) {
  const h = {
    'Content-Type': 'application/json',
    Cookie: `evaluadorToken=${sesion.token}; csrfToken=${sesion.csrf}`,
  };
  if (mutante) h['x-csrf-token'] = sesion.csrf;
  return h;
}

function paso(res, etiqueta) {
  const ok = check(res, { [`${etiqueta}: status 2xx`]: (r) => r.status >= 200 && r.status < 300 });
  flowErrors.add(ok ? 0 : 1);
  return ok;
}

function ultimasVersiones(artefactos) {
  const porLogico = {};
  for (const a of artefactos) {
    const actual = porLogico[a.artefactoLogicoId];
    if (!actual || a.version > actual.version) porLogico[a.artefactoLogicoId] = a;
  }
  return Object.values(porLogico);
}

export function evaluador(datos) {
  const h = cabeceras(datos.evaluador);
  const hm = cabeceras(datos.evaluador, true);
  const raiz = `${BASE_URL}/api/projects/${PROYECTO_ID}/artifacts`;

  if (!paso(http.get(`${BASE_URL}/api/projects`, { headers: h, tags: { name: 'projects_list' } }), 'projects_list')) return;
  pensar();

  const lista = http.get(raiz, { headers: h, tags: { name: 'artifacts_list' }, responseType: 'text' });
  if (!paso(lista, 'artifacts_list')) return;
  const artefactos = ultimasVersiones(lista.json());
  if (artefactos.length === 0) {
    flowErrors.add(1);
    return;
  }
  pensar();

  const artefacto = artefactos[__VU % artefactos.length];
  if (!paso(http.get(`${raiz}/${artefacto.id}`, { headers: h, tags: { name: 'artifact_get' } }), 'artifact_get')) return;
  pensar();

  const lock = http.post(
    `${raiz}/${artefacto.id}/lock`,
    JSON.stringify({ ttlSegundos: 30 }),
    { headers: hm, tags: { name: 'lock' } },
  );
  if (!paso(lock, 'lock')) return;
  pensar();

  paso(http.del(`${raiz}/${artefacto.id}/lock`, null, { headers: hm, tags: { name: 'unlock' } }), 'unlock');
  pensar();
}

export function admin(datos) {
  if (!datos.admin) {
    flowErrors.add(1);
    return;
  }
  const h = cabeceras(datos.admin);
  const pedidos = [
    ['admin_overview', `${BASE_URL}/api/projects/admin/overview`],
    ['users_docentes', `${BASE_URL}/api/users`],
    ['users_accounts', `${BASE_URL}/api/users/accounts`],
  ];
  for (const [nombre, url] of pedidos) {
    if (!paso(http.get(url, { headers: h, tags: { name: nombre } }), nombre)) return;
    pensar();
  }
}

export default evaluador;
