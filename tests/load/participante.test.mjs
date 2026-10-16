import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('./participante.k6.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '')
  .replace('export const options', 'const options')
  .replace('export default function ()', 'function participante()');

function ejecutar(estudio) {
  const requests = [];
  const responses = [
    { participant: { id: 'participante' }, resume_token: 'resume' },
    {},
    { access_token: 'token' },
    { id: 'sesion-participante', cardsDefinidas: [], categoriasDefinidas: [], estudio },
    {},
  ];
  runInNewContext(`${source}\nparticipante();`, {
    __ENV: { BASE_URL: 'http://local', PROYECTO_ID: 'proyecto', ESTUDIO_ID: 'estudio' },
    __VU: 1,
    http: {
      post(url, body) {
        const response = responses[requests.length];
        requests.push({ url, body: body ? JSON.parse(body) : null });
        return { status: 201, json: () => response, timings: { duration: 1 } };
      },
    },
    check: (response, checks) => Object.values(checks).every(check => check(response)),
    fail: message => { throw new Error(message); },
    Rate: class { add() {} },
    Trend: class { add() {} },
  });
  assert.equal(requests.length, 5, 'El flujo debe enviar resultados después de join');
  assert.equal(requests[4].url, 'http://local/api/card-sorting/sessions/sesion-participante/results');
  return requests[4].body;
}

test('envía tarjetas del estudio anidado a sus categorías predefinidas', () => {
  assert.deepEqual(ejecutar({
    cardsDefinidas: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    categoriasDefinidas: [{ id: 'uno' }, { id: 'dos' }],
  }), {
    grupos: [
      { categoriaId: 'uno', cardIds: ['a', 'c'] },
      { categoriaId: 'dos', cardIds: ['b'] },
    ],
  });
});

test('envía tarjetas del estudio abierto en una categoría nueva', () => {
  assert.deepEqual(ejecutar({
    cardsDefinidas: [{ id: 'a' }, { id: 'b' }], categoriasDefinidas: [],
  }), { grupos: [{ categoriaNombre: 'Grupo carga VU 1', cardIds: ['a', 'b'] }] });
});
