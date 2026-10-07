// Comprueba los scripts con k6 real y una API local de contrato, sin Docker/BD.
// Ejecutar: node tests/load/check.mjs (k6 en PATH o K6_BIN=/ruta/a/k6).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, readdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from '../../apps/backend/node_modules/typescript/lib/typescript.js';

const main = await readFile(new URL('../../apps/backend/src/main.ts', import.meta.url), 'utf8');
const csrfSource = main.slice(main.indexOf('const METODOS_MUTANTES'), main.indexOf('// Aplana'));
const csrf = new Function(`${ts.transpile(csrfSource)}; return csrfProtection;`)();
const completed = new Set();
let violation;
let rejectResults = false;
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  req.path = req.url;
  req.header = (name) => req.headers[name];
  req.cookies = Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map((c) => c.trim().split('=')));
  res.status = (status) => { res.statusCode = status; return res; };
  res.json = (body) => res.end(JSON.stringify(body));
  let text = '';
  for await (const chunk of req) text += chunk;
  const body = text ? JSON.parse(text) : {};
  csrf(req, res, () => {
    try {
      if (req.url === '/api/auth/login') {
        res.setHeader('Set-Cookie', [`evaluadorToken=${body.email}; Path=/; HttpOnly`, 'csrfToken=review-csrf; Path=/']);
        return res.json({ user: {} });
      }
      if (req.url === '/api/auth/participants/access') return res.json({ participant: { id: 'participant' }, resume_token: 'resume' });
      if (req.url === '/api/auth/participants/consent') { assert.equal(body.resumeToken, 'resume'); return res.json({ aceptado: true }); }
      if (req.url === '/api/auth/participants/token') return res.json({ access_token: 'participant-token' });
      if (req.url === '/api/card-sorting/sessions/study/join') {
        assert.equal(req.headers.authorization, 'Bearer participant-token');
        return res.json({ id: 'session', cardsDefinidas: [{ id: 'card' }], categoriasDefinidas: [{ id: 'category' }] });
      }
      if (req.url === '/api/card-sorting/sessions/session/results') {
        assert.equal(req.headers.authorization, 'Bearer participant-token');
        assert.deepEqual(body.grupos, [{ categoriaId: 'category', cardIds: ['card'] }]);
        if (rejectResults) return res.status(500).json({ error: 'synthetic failure' });
        completed.add('participante');
        return res.json({ id: 'session' });
      }
      if (req.url.startsWith('/api/users') || req.url === '/api/projects/admin/overview') {
        assert.equal(req.cookies.evaluadorToken, 'admin');
        if (req.url === '/api/users/accounts') completed.add('admin');
        return res.json([]);
      }
      assert.equal(req.cookies.evaluadorToken, 'evaluator');
      if (req.url === '/api/projects') return res.json([{ id: 'project' }]);
      const artifact = { id: 'artifact', artefactoLogicoId: 'logical', version: 1 };
      if (req.url === '/api/projects/project/artifacts') return res.json([artifact]);
      if (req.url === '/api/projects/project/artifacts/artifact') return res.json(artifact);
      if (req.url === '/api/projects/project/artifacts/artifact/lock') {
        if (req.method === 'DELETE') completed.add('evaluador');
        return res.json(artifact);
      }
      throw new Error(`Ruta inesperada: ${req.method} ${req.url}`);
    } catch (error) { violation = error; res.status(500).json({ error: error.message }); }
  });
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const directory = await mkdtemp(join(tmpdir(), 'k6-contract-'));
try {
  const script = join(directory, 'check.k6.js');
  const moduleURL = new URL('./mixto.k6.js', import.meta.url).href;
  await writeFile(script, `
    import { options as base, evaluador, participante, admin, setup } from ${JSON.stringify(moduleURL)};
    export { evaluador, participante, admin, setup };
    export const options = { ...base, scenarios: Object.fromEntries(['evaluador', 'participante', 'admin'].map(exec => [exec, {executor:'per-vu-iterations', exec, vus:1, iterations:1}])) };
  `);
  const windows = process.platform === 'win32';
  const command = windows ? 'pwsh' : (process.env.K6_BIN || 'k6');
  const args = windows
      ? ['-NoProfile', '-File', fileURLToPath(new URL('./run.ps1', import.meta.url)), '-Script', script, '-ResultDir', join(directory, 'results'), '-K6Path', process.env.K6_BIN || 'k6']
      : ['run', '--quiet', script];
  const environment = { ...process.env, BASE_URL: `http://127.0.0.1:${server.address().port}`, FASE: 'smoke', PROYECTO_ID: 'project', ESTUDIO_ID: 'study', EVAL_EMAIL: 'evaluator', EVAL_PASSWORD: 'synthetic', ADMIN_EMAIL: 'admin', ADMIN_PASSWORD: 'synthetic', PAUSA_MIN: '0', PAUSA_MAX: '0' };
  const run = (executable, argumentsK6, overrides = {}) => new Promise((resolve, reject) => {
    const processK6 = spawn(executable, argumentsK6, {
      env: { ...environment, ...overrides },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    processK6.stdout.on('data', (chunk) => { output += chunk; });
    processK6.stderr.on('data', (chunk) => { output += chunk; });
    processK6.once('error', reject);
    processK6.once('close', (code) => resolve({ code, output }));
  });
  const result = await run(command, args);
  assert.ifError(violation);
  assert.equal(result.code, 0, result.output);
  assert.deepEqual([...completed].sort(), ['admin', 'evaluador', 'participante']);
  if (windows) {
    const [resultName] = await readdir(join(directory, 'results'));
    const resources = JSON.parse(await readFile(join(directory, 'results', resultName, 'resources.json'), 'utf8'));
    assert.equal(resources.exitCode, 0);
    assert.ok(resources.k6PeakRamMiB > 0);
  }
  for (const pauses of [{ PAUSA_MIN: '-1' }, { PAUSA_MAX: 'invalid' }, { PAUSA_MIN: '2', PAUSA_MAX: '1' }]) {
    const invalid = await run(process.env.K6_BIN || 'k6', ['inspect', '--include-system-env-vars', script], pauses);
    assert.notEqual(invalid.code, 0);
    assert.match(invalid.output, /PAUSA_MIN.*PAUSA_MAX/);
  }
  rejectResults = true;
  const failed = await run(command, args);
  assert.equal(failed.code, 99, failed.output);
  if (windows) {
    const names = await readdir(join(directory, 'results'));
    const codes = await Promise.all(names.map(async (name) => JSON.parse(await readFile(join(directory, 'results', name, 'resources.json'), 'utf8')).exitCode));
    assert.deepEqual(codes.sort((a, b) => a - b), [0, 99]);
  }
  console.log('OK: logins, CSRF, tres flujos, configuración de pausas y registro de RAM en Windows.');
} finally {
  await new Promise((resolve) => server.close(resolve));
  assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
  await rm(directory, { recursive: true, force: true });
}
