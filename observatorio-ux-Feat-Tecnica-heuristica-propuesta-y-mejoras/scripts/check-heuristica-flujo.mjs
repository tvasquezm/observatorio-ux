import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
assert.ok(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname), 'Solo se permite PostgreSQL local.');
assert.equal(new URL(process.env.DATABASE_URL).pathname, '/observatorio_ux_heuristica_pr43', 'Esta prueba solo modifica la base aislada del PR43.');
assert.equal(new URL(process.env.DATABASE_URL).port, '5434', 'Solo se permite PostgreSQL aislado en 5434.');
assert.equal(process.env.PORT, '3002', 'La API de prueba debe escuchar en 3002.');
const requireBackend = createRequire(new URL('../apps/backend/package.json', import.meta.url));
requireBackend('reflect-metadata');
const bcrypt = requireBackend('bcrypt');
const { METODOLOGIAS_HEURISTICAS } = requireBackend('@observatorio-ux/shared-types');
const { PrismaService } = await import('../apps/backend/dist/src/core/database/prisma.service.js');
const prisma = new PrismaService();
const base = 'http://127.0.0.1:3002/api';
const password = 'Heuristica-pr43-test!';
const sufijo = `${Date.now()}-${randomUUID().slice(0,8)}`;
let verificaciones = 0;

function token(user) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now()/1000);
  const data = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, actor: 'EVALUADOR', rol: user.rol, email: user.email, iat: now, exp: now+3600 })}`;
  return `${data}.${createHmac('sha256', process.env.JWT_SECRET).update(data).digest('base64url')}`;
}
async function api(user, method, ruta, body, status = 200) {
  const multipart = body instanceof FormData;
  const response = await fetch(`${base}${ruta}`, { method, headers: { Authorization: `Bearer ${token(user)}`, ...(!multipart && body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? multipart ? body : JSON.stringify(body) : undefined });
  const type = response.headers.get('content-type') ?? '';
  const result = type.includes('application/json') ? await response.json() : Buffer.from(await response.arrayBuffer());
  assert.equal(response.status, status, `${method} ${ruta}: ${JSON.stringify(result)}`);
  verificaciones++;
  return { data: result, response };
}
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS5kAAAAASUVORK5CYII=', 'base64');
function archivo() { const body = new FormData(); body.append('archivo', new Blob([png], { type: 'image/png' }), 'captura.png'); return body; }

try {
  await prisma.$connect();
  const passwordHash = await bcrypt.hash(password, 10);
  const crearUsuario = (nombre, rol) => prisma.usuario.create({ data: { nombre, rol, email: `${nombre.toLowerCase()}-${sufijo}@example.test`, passwordHash } });
  const coordinador = await crearUsuario('Coordinador', 'DOCENTE');
  const expertos = await Promise.all(Array.from({ length: 5 }, (_, i) => crearUsuario(`Experto${i+1}`, 'ESTUDIANTE')));
  const lector = await crearUsuario('Lector', 'ESTUDIANTE');
  const admin = await crearUsuario('Admin', 'ADMIN');
  const sala = await prisma.sala.create({ data: { nombre: `Prueba heurística ${sufijo}`, periodo: '2026', profesorId: coordinador.id } });
  await prisma.salaEstudiante.createMany({ data: [...expertos, lector].map(u => ({ salaId: sala.id, email: u.email, nombre: u.nombre })) });
  const proyecto = await prisma.proyecto.create({ data: { nombre: `Heurística PR43 ${sufijo}`, creadoPorId: coordinador.id, salaId: sala.id, miembros: { create: [...expertos, lector].map(u => ({ usuarioId: u.id })) } } });
  const otroProyecto = await prisma.proyecto.create({ data: { nombre: 'Control de proyecto URL', creadoPorId: coordinador.id } });
  const ruta = `/projects/${proyecto.id}/evaluacion-heuristica`;
  const evaluaciones = `${ruta}/evaluaciones`;
  const req = async (u, m, path, b, s) => (await api(u, m, path, b, s)).data;
  const config = cantidad => ({ nombre: `Prueba ${cantidad} expertos`, producto: { clave: 'web-pr43', nombre: 'Producto de prueba', version: '1', url: 'https://example.test', dispositivo: 'PC' }, objetivo: 'Inspeccionar el flujo', tareas: 'Completar una compra', pantallas: 'Inicio y compra', exclusiones: 'Ninguna', metodologia: structuredClone(METODOLOGIAS_HEURISTICAS[0]), evaluadorIds: expertos.slice(0,cantidad).map(u => u.id), lectorIds: [lector.id] });
  const nuevoHallazgo = evidenciaIds => ({ id: randomUUID(), criterioIds: [METODOLOGIAS_HEURISTICAS[0].criterios[0].id], titulo: 'No hay confirmación de progreso', pantalla: 'Inicio', descripcion: 'La acción no muestra su estado.', recomendacion: 'Añadir indicador y confirmación.', severidad: 2, prioridad: 'MEDIA', notas: '', evidenciaIds });
  const finalizar = async cantidad => {
    let e = await req(coordinador, 'POST', evaluaciones, config(cantidad), 201);
    const path = `${evaluaciones}/${e.id}`;
    await req(coordinador, 'GET', `/projects/${otroProyecto.id}/evaluacion-heuristica/evaluaciones/${e.id}`, undefined, 404);
    await req(admin, 'GET', path, undefined, 403);
    await req(lector, 'GET', path, undefined, 403);
    await req(coordinador, 'PATCH', `${path}/configuracion`, { revision: e.revision, configuracion: { ...config(cantidad), evaluadorIds: [randomUUID()] } }, 400);
    e = await req(coordinador, 'POST', `${path}/iniciar`, { revision: e.revision }, 201);
    assert.equal(e.trabajos.length, 0);
    assert.equal(e.avanceEquipo.length, cantidad);
    await req(expertos[0], 'POST', `${path}/entregar`, { revision: e.revision }, 400);
    const aceptada = await req(expertos[0], 'POST', `${path}/evidencias`, archivo(), 201);
    const descartada = await req(expertos[0], 'POST', `${path}/evidencias`, archivo(), 201);
    for (const u of [coordinador, lector, admin, ...(cantidad > 1 ? [expertos[1]] : [])]) {
      await req(u, 'GET', `${path}/evidencias/${aceptada.id}`, undefined, 403);
      await req(u, 'GET', `${path}/evidencias/${aceptada.id}/meta`, undefined, 403);
    }
    const anotaciones = [{ id: randomUUID(), tipo: 'rectangulo', x: 0, y: 0, x2: 1, y2: 1, color: '#ff0000', texto: 'Problema' }];
    const saves = await Promise.all(Array.from({ length: 2 }, () => fetch(`${base}${path}/evidencias/${aceptada.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token(expertos[0])}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: aceptada.revision, anotaciones }) })));
    assert.deepEqual(saves.map(s => s.status).sort(), [200,409]); verificaciones+=2;
    const original = await api(expertos[0], 'GET', `${path}/evidencias/${aceptada.id}`);
    assert.deepEqual(original.data, png);
    assert.equal(original.response.headers.get('cache-control'), 'private, no-store');
    await req(expertos[0], 'PATCH', `${path}/evidencias/${aceptada.id}`, { revision: 1, anotaciones: [{ ...anotaciones[0], x: 2 }] }, 400);
    const respuestas = e.configuracion.metodologia.criterios.map(c => ({ criterioId: c.id, valor: null, noAplica: true, motivo: 'Fuera de la tarea evaluada', notas: '' }));
    if (cantidad > 1) await req(expertos[1], 'PATCH', `${path}/trabajo`, { revision: e.revision, respuestas, hallazgos: [nuevoHallazgo([aceptada.id])] }, 400);
    const inicial = { revision: e.revision, respuestas, hallazgos: [nuevoHallazgo([aceptada.id]), nuevoHallazgo([descartada.id])] };
    const savesTrabajo = await Promise.allSettled([req(expertos[0], 'PATCH', `${path}/trabajo`, inicial), req(expertos[0], 'PATCH', `${path}/trabajo`, inicial)]);
    assert.equal(savesTrabajo.filter(r => r.status === 'fulfilled').length, 1);
    assert.match(savesTrabajo.find(r => r.status === 'rejected').reason.message, /409/);
    e = await req(expertos[0], 'GET', path);
    e = await req(expertos[0], 'POST', `${path}/entregar`, { revision: e.revision }, 201);
    await req(expertos[0], 'PATCH', `${path}/evidencias/${aceptada.id}`, { revision: 1, anotaciones }, 409);
    for (const experto of expertos.slice(1,cantidad)) {
      e = await req(experto, 'PATCH', `${path}/trabajo`, { revision: e.revision, respuestas, hallazgos: [nuevoHallazgo([])] });
      e = await req(experto, 'POST', `${path}/entregar`, { revision: e.revision }, 201);
    }
    e = await req(coordinador, 'GET', path);
    assert.equal(e.fase, 'PENDIENTE_CONSENSO');
    assert.equal(e.trabajos.length, cantidad);
    await req(coordinador, 'GET', `${path}/evidencias/${aceptada.id}/meta`);
    const originales = e.trabajos.flatMap(t => t.hallazgos);
    const hallazgos = originales.map((h, i) => ({ ...h, origenIds: [h.id], decision: i === 1 ? 'DESCARTADO' : 'ACEPTADO', justificacion: i === 1 ? 'Descartado: no ocurre en el alcance acordado.' : 'Confirmado por los expertos.' }));
    const criterios = respuestas.map(r => ({ ...r, justificacion: 'Se revisó el alcance y cada experto confirmó no aplica.' }));
    e = await req(coordinador, 'PATCH', `${path}/consenso`, { revision: e.revision, criterios, hallazgos: hallazgos.slice(1) });
    await req(expertos[0], 'POST', `${path}/aprobar`, { revision: e.revision }, 400);
    e = await req(coordinador, 'PATCH', `${path}/consenso`, { revision: e.revision, criterios, hallazgos });
    await req(coordinador, 'POST', `${path}/consolidar`, { revision: e.revision }, 409);
    e = await req(expertos[0], 'POST', `${path}/aprobar`, { revision: e.revision }, 201);
    e = await req(coordinador, 'PATCH', `${path}/consenso`, { revision: e.revision, criterios, hallazgos });
    assert.deepEqual(e.consenso.aprobadoPor, []);
    for (const experto of expertos.slice(0,cantidad)) e = await req(experto, 'POST', `${path}/aprobar`, { revision: e.revision }, 201);
    e = await req(coordinador, 'POST', `${path}/consolidar`, { revision: e.revision }, 201);
    const vistaLector = await req(lector, 'GET', path);
    assert.deepEqual(vistaLector.trabajos, []);
    assert.ok(vistaLector.informe.consenso.hallazgos.every(h => h.decision === 'ACEPTADO'));
    await req(lector, 'GET', `${path}/evidencias/${aceptada.id}/meta`);
    assert.deepEqual((await api(lector, 'GET', `${path}/evidencias/${aceptada.id}`)).data, png);
    await req(lector, 'GET', `${path}/evidencias/${descartada.id}`, undefined, 403);
    await req(lector, 'GET', `${path}/evidencias/${descartada.id}/meta`, undefined, 403);
    e = await req(coordinador, 'POST', `${path}/finalizar`, { revision: e.revision }, 201);
    const snapshot = structuredClone(e.informe);
    const version = await req(coordinador, 'POST', `${path}/version`, { revision: e.revision }, 201);
    assert.equal(version.version, 2); assert.deepEqual(version.trabajos, []);
    e = await req(coordinador, 'GET', path);
    assert.deepEqual(e.informe, snapshot);
    console.log(`HTTP ${cantidad} experto(s): consenso, privacidad, revisiones e informe OK`);
    return e;
  };
  const anterior = await finalizar(1), actual = await finalizar(5);
  const path = `${evaluaciones}/${actual.id}`;
  const comp = await req(lector, 'GET', `${path}/comparacion/${anterior.id}`);
  assert.equal(comp.compatible, true); assert.deepEqual(comp.vinculos, []);
  const vinculo = { anteriorId: anterior.informe.consenso.hallazgos.find(h => h.decision === 'ACEPTADO').id, actualId: null, estado: 'SOLUCIONADO', justificacion: '' };
  await req(coordinador, 'PATCH', `${path}/comparacion`, { revision: actual.revision, previaId: anterior.id, vinculos: [vinculo] }, 400);
  const guardada = await req(coordinador, 'PATCH', `${path}/comparacion`, { revision: actual.revision, previaId: anterior.id, vinculos: [{ ...vinculo, justificacion: 'La tarea se reprodujo y se verificó la corrección.' }] });
  assert.deepEqual(guardada.informe, actual.informe);
  const copia = await req(coordinador, 'POST', `${ruta}/metodologias`, METODOLOGIAS_HEURISTICAS[0], 201);
  assert.equal(copia.protegida, false); assert.equal(copia.autor, coordinador.nombre);
  console.log(JSON.stringify({ verificaciones, proyectoId: proyecto.id, salaId: sala.id, coordinador: coordinador.email, experto: expertos[0].email, lector: lector.email, password, url: `http://localhost:5174/proyectos/${proyecto.id}/evaluacion-heuristica` }, null, 2));
} finally { await prisma.$disconnect(); }
