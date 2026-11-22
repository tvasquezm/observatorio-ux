// Run after pnpm --filter backend build. Uses an in-memory identity, never a database.
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthService } from '../dist/src/modules/auth/auth.service.js';
import { AuthController } from '../dist/src/modules/auth/auth.controller.js';
import { JwtStrategy } from '../dist/src/modules/auth/jwt.strategy.js';
import { GoogleAuthService } from '../dist/src/modules/auth/google-auth.service.js';
import { csrfProtection } from '../dist/src/common/csrf.js';

process.env.CORS_ORIGIN = 'https://observatorio.example';
const origin = process.env.CORS_ORIGIN;
const secret = 'evaluador-secret-solo-para-pruebas';
const jwt = new JwtService({ secret });
const user = { id: 'u1', email: 'docente@utem.cl', rol: 'DOCENTE', actor: 'EVALUADOR' };
const config = new ConfigService({ jwt: { secret }, app: { nodeEnv: 'production' } });
// Identidad en memoria: `version` emula Usuario.sesionVersion (F9).
let version = 0;
const prisma = {
  usuario: {
    updateMany: async ({ data }) => {
      if (data?.sesionVersion?.increment) version += data.sesionVersion.increment;
      return { count: 1 };
    },
  },
};
const service = new AuthService(prisma, jwt, {}, config);
service.validateTokenPayload = async (payload) => {
  if ((payload.sv ?? 0) !== version) throw new UnauthorizedException('Tu sesión ya no es válida. Vuelve a iniciar sesión.');
  return user;
};
service.getEvaluatorProfile = async () => user;
const module = await Test.createTestingModule({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }])], controllers: [AuthController],
  providers: [JwtStrategy, { provide: AuthService, useValue: service }, { provide: ConfigService, useValue: config }, { provide: GoogleAuthService, useValue: { clientId: '' } }, { provide: APP_GUARD, useClass: ThrottlerGuard }],
}).compile();
const app = module.createNestApplication({ logger: false });
app.use(cookieParser());
app.use(csrfProtection);
await app.init();
try {
  const now = Math.floor(Date.now() / 1000);
  const sinVersion = (exp, sessionStart = now) => jwt.sign({ sub: 'u1', actor: 'EVALUADOR', exp, sessionStart });
  const token = (exp, sessionStart = now) => jwt.sign({ sub: 'u1', actor: 'EVALUADOR', exp, sessionStart, sv: version });
  const cookieWith = (value) => `evaluadorToken=${value}; csrfToken=test-csrf`;
  const cookie = (exp, start) => cookieWith(token(exp, start));
  const server = app.getHttpServer();
  const otherOrigin = await request(server).post('/auth/refresh')
    .set('Origin', 'https://otro.example')
    .set('Cookie', cookie(now + 100))
    .set('Authorization', `Bearer ${token(now + 100)}`)
    .set('x-csrf-token', 'test-csrf')
    .expect(403);
  assert.equal(otherOrigin.body.message, 'Origen no permitido.');
  await request(server).post('/auth/logout').set('Origin', 'https://otro.example').expect(201);
  await request(server).post('/auth/refresh').set('Cookie', cookie(now + 100)).expect(403);
  await request(server).post('/auth/refresh').set('Cookie', cookie(now - 1)).set('x-csrf-token', 'test-csrf').expect(401);
  // Un token anterior a la versión de sesión (sin `sv`) sigue sirviendo mientras la versión sea 0.
  await request(server).get('/auth/me').set('Cookie', cookieWith(sinVersion(now + 100))).expect(200);
  const exp = now + 1800;
  const me = await request(server).get('/auth/me').set('Cookie', cookie(exp)).expect(200);
  assert.equal(me.body.session.expiresAt, exp * 1000);
  const start = now - 43000;
  const refreshed = await request(server).post('/auth/refresh')
    .set('Origin', origin)
    .set('Cookie', cookie(now + 100, start))
    .set('Authorization', `Bearer ${token(now + 100, start)}`)
    .expect(200);
  assert.deepEqual(refreshed.body, { renewed: true, session: { expiresAt: (start + 43200) * 1000 } });
  assert.match(refreshed.headers['set-cookie'][0], /HttpOnly/);
  assert.match(refreshed.headers['set-cookie'][0], /Secure/);
  // Revocación (F9): cerrar sesión sube la versión y la cookie anterior deja de renovar.
  const anterior = cookie(now + 100);
  await request(server).post('/auth/logout').set('Cookie', anterior).set('x-csrf-token', 'test-csrf').expect(201);
  assert.equal(version, 1);
  await request(server).post('/auth/refresh').set('Cookie', anterior).set('x-csrf-token', 'test-csrf').expect(401);
  await request(server).get('/auth/me').set('Cookie', anterior).expect(401);
  await request(server).post('/auth/refresh').set('Cookie', cookie(now + 100)).set('x-csrf-token', 'test-csrf').expect(200);
  // Cerrar sesión sin token válido solo limpia cookies.
  await request(server).post('/auth/logout').set('Cookie', 'evaluadorToken=basura; csrfToken=test-csrf').set('x-csrf-token', 'test-csrf').expect(201);
  let status;
  for (let i = 0; i < 11; i++) status = (await request(server).post('/auth/refresh').set('Cookie', cookie(exp)).set('x-csrf-token', 'test-csrf')).status;
  assert.equal(status, 429);
  console.log('PASS refresh: origen, CSRF, expired JWT, me expiry, capped renewal, secure httpOnly cookie, revocación tras logout, 429.');
} finally { await app.close(); }
