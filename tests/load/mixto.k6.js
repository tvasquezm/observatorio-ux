// Carga mixta: 70 % evaluador, 25 % participante, 5 % admin (reparto
// supuesto; ajustar las fracciones si se conoce el uso real). Los VUs de
// cada escenario siguen la misma FASE, escalados por su fracción.
//
// Uso:
//   FASE=load BASE_URL=http://localhost:8080 \
//   PROYECTO_ID=f1e1b6a1-0001-4a11-9c00-000000000002 \
//   ESTUDIO_ID=f1e1b6a1-0002-4a11-9c00-000000000003 \
//   EVAL_EMAIL=<email> EVAL_PASSWORD=<password> \
//   ADMIN_EMAIL=<email> ADMIN_PASSWORD=<password> \
//   k6 run tests/load/mixto.k6.js

import { FASE, requerida } from './lib/config.js';
import { etapas, umbrales } from './lib/fases.js';
import { evaluador, admin } from './evaluador.k6.js';
import { participante } from './participante.k6.js';

export { setup } from './evaluador.k6.js';
export { evaluador, admin, participante };

requerida('ADMIN_EMAIL');
requerida('ADMIN_PASSWORD');

export const options = {
  scenarios: {
    evaluador: { executor: 'ramping-vus', exec: 'evaluador', startVUs: 0, stages: etapas(FASE, 0.7) },
    participante: { executor: 'ramping-vus', exec: 'participante', startVUs: 0, stages: etapas(FASE, 0.25) },
    admin: { executor: 'ramping-vus', exec: 'admin', startVUs: 0, stages: etapas(FASE, 0.05) },
  },
  thresholds: { ...umbrales(FASE), flow_errors: ['rate<0.05'] },
};
