// Run after pnpm --filter backend build. Uses an in-memory identity, never a database.
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthService } from '../dist/src/modules/auth/auth.service.js';
import { AuthController } from '../dist/src/modules/auth/auth.controller.js';
import { JwtStrategy } from '../dist/src/modules/auth/jwt.strategy.js';
import { csrfProtection } from '../dist/src/common/csrf.js';

const secret = 'evaluador-secret-solo-para-pruebas';
const jwt = new JwtService({ secret });
const user = { id: 'u1', email: 'docente@utem.cl', rol: 'DOCENTE', actor: 'EVALUADOR' };
const config = new ConfigService({ jwt: { secret }, app: { nodeEnv: 'production' } });
const service = new AuthService({}, jwt, {}, config);
service.validateTokenPayload = async () => user;
service.getEvaluatorProfile = async () => user;
const module = await Test.createTestingModule({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }])], controllers: [AuthController],
  providers: [JwtStrategy, { provide: AuthService, useValue: service }, { provide: ConfigService, useValue: config }, { provide: APP_GUARD, useClass: ThrottlerGuard }],
}).compile();
const app = module.createNestApplication({ logger: false });
app.use(cookieParser());
app.use(csrfProtection);
await app.init();
try {
  const now = Math.floor(Date.now() / 1000);
  const token = (exp, sessionStart = now) => jwt.sign({ sub: 'u1', actor: 'EVALUADOR', exp, sessionStart });
  const cookie = (exp, start) => `evaluadorToken=${token(exp, start)}; csrfToken=test-csrf`;
  const server = app.getHttpServer();
  await request(server).post('/auth/refresh').set('Cookie', cookie(now + 100)).expect(403);
  await request(server).post('/auth/refresh').set('Cookie', cookie(now - 1)).set('x-csrf-token', 'test-csrf').expect(401);
  const exp = now + 1800;
  const me = await request(server).get('/auth/me').set('Cookie', cookie(exp)).expect(200);
  assert.equal(me.body.session.expiresAt, exp * 1000);
  const start = now - 43000;
  const refreshed = await request(server).post('/auth/refresh').set('Cookie', cookie(now + 100, start)).set('x-csrf-token', 'test-csrf').expect(200);
  assert.deepEqual(refreshed.body, { renewed: true, session: { expiresAt: (start + 43200) * 1000 } });
  assert.match(refreshed.headers['set-cookie'][0], /HttpOnly/);
  assert.match(refreshed.headers['set-cookie'][0], /Secure/);
  let status;
  for (let i = 0; i < 11; i++) status = (await request(server).post('/auth/refresh').set('Cookie', cookie(exp)).set('x-csrf-token', 'test-csrf')).status;
  assert.equal(status, 429);
  console.log('PASS refresh: CSRF, expired JWT, me expiry, capped renewal, secure httpOnly cookie, 429.');
} finally { await app.close(); }
