const PELDANOS = [25, 50, 100, 150, 200];

const FASES = {
  smoke: [
    { duration: '5s', target: 1 },
    { duration: '55s', target: 1 },
  ],
  baseline: [
    { duration: '30s', target: 10 },
    { duration: '2m30s', target: 10 },
  ],
  load: [
    ...PELDANOS.flatMap((target) => [
      { duration: '30s', target },
      { duration: '2m30s', target },
    ]),
    { duration: '30s', target: 0 },
  ],
  stress: [
    { duration: '2m', target: 200 },
    { duration: '3m', target: 200 },
    { duration: '2m', target: 300 },
    { duration: '3m', target: 300 },
    { duration: '1m', target: 0 },
  ],
  spike: [
    { duration: '10s', target: 200 },
    { duration: '3m', target: 200 },
    { duration: '20s', target: 0 },
  ],
  soak: [
    { duration: '2m', target: 100 },
    { duration: '30m', target: 100 },
    { duration: '1m', target: 0 },
  ],
};

const UMBRALES = {
  smoke: { http_req_failed: ['rate==0'] },
  baseline: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<300'] },
  load: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<500'] },
  stress: { http_req_failed: ['rate<0.10'] },
  spike: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<800'] },
  soak: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<500'] },
};

function validar(fase) {
  if (!FASES[fase]) {
    throw new Error(`FASE inválida: ${fase}. Usar: ${Object.keys(FASES).join(', ')}.`);
  }
}

export function etapas(fase, fraccion = 1) {
  validar(fase);
  return FASES[fase].map((etapa) => ({
    duration: etapa.duration,
    target: etapa.target === 0 ? 0 : Math.max(1, Math.round(etapa.target * fraccion)),
  }));
}

export function umbrales(fase) {
  validar(fase);
  return UMBRALES[fase];
}
