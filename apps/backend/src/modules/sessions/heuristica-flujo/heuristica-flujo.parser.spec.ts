import { Body, Controller, Patch } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { LIMITE_JSON_FLUJO } from './heuristica-flujo.parser.js';
import { GlobalExceptionFilter } from '../../../common/filters/global-exception.filter.js';

@Controller('api/projects/p/evaluacion-heuristica/evaluaciones/e')
class TransporteController {
  @Patch('trabajo')
  guardar(@Body() body: { hallazgos: unknown[] }) { return { cantidad: body.hallazgos.length }; }
}

describe('Transporte del consenso', () => {
  it('admite un trabajo completo mayor a 100KB y limita a 5MB', async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [TransporteController] }).compile();
    const app = moduleRef.createNestApplication<NestExpressApplication>();
    app.useLogger(false);
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useBodyParser('json', { limit: LIMITE_JSON_FLUJO });
    await app.init();
    const ruta = '/api/projects/p/evaluacion-heuristica/evaluaciones/e/trabajo';
    const hallazgos = Array.from({ length: 60 }, (_, id) => ({ id, descripcion: 'd'.repeat(1000), recomendacion: 'r'.repeat(1000) }));
    try {
      await request(app.getHttpServer()).patch(ruta).send({ hallazgos }).expect(200, { cantidad: 60 });
      await request(app.getHttpServer()).patch(ruta).send({ hallazgos: [{ descripcion: 'd'.repeat(5*1024*1024) }] }).expect(413);
    } finally { await app.close(); }
  });
});
