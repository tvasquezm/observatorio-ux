import { csrfProtection } from './common/csrf.js';
import { BadRequestException, ValidationPipe, ValidationError } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { LIMITE_JSON_FLUJO } from './modules/sessions/heuristica-flujo/heuristica-flujo.parser.js';

// Aplana los ValidationError de class-validator (incluye anidados, ej.
// contenido.hobbies.0) a la forma estructurada que el frontend necesita
// para marcar el input exacto que falló: [{ campo, mensaje }].
function formatValidationErrors(
  errors: ValidationError[],
  prefix = '',
): { campo: string; mensaje: string }[] {
  const resultado: { campo: string; mensaje: string }[] = [];
  for (const error of errors) {
    const campo = prefix ? `${prefix}.${error.property}` : error.property;
    if (error.constraints) {
      // Nos quedamos con el primer mensaje de constraint por campo — alcanza
      // para resaltar el input; si se necesitan todos, cambiar a Object.values.join.
      resultado.push({ campo, mensaje: Object.values(error.constraints)[0] });
    }
    if (error.children?.length) {
      resultado.push(...formatValidationErrors(error.children, campo));
    }
  }
  return resultado;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  app.useBodyParser('json', { limit: LIMITE_JSON_FLUJO });

  if (config.get<string>('app.nodeEnv') === 'production') {
    // Por defecto 1: el compose coloca exactamente un Nginx delante del
    // backend. Limitar la confianza a N saltos mantiene req.ip útil para
    // throttling sin aceptar una cadena X-Forwarded-For arbitraria enviada
    // por el cliente. Con más proxies delante (ej. Vercel -> Render) subir
    // TRUST_PROXY_HOPS; si es menor al real, todos comparten la misma IP.
    app.set('trust proxy', config.getOrThrow<number>('app.trustProxyHops'));
  }

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.use(helmet());
  
  // ORDEN CORRECTO: cookieParser debe ir ANTES de cualquier middleware
  // que necesite leer las cookies (como csrfProtection).
  app.use(cookieParser());
  app.use(csrfProtection);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config.getOrThrow<string>('app.corsOrigin'),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      // El filtro global toma esto como `message` y lo pasa tal cual —
      // llega al frontend como array estructurado, no como string[] genérico.
      exceptionFactory: (errors) =>
        new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: formatValidationErrors(errors),
        }),
    }),
  );

  if (config.get<string>('app.nodeEnv') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('API Observatorio UX')
      .setDescription(
        [
          'API para estudios de investigación UX.',
          '',
          '### Cómo autenticarte aquí (2 pasos, solo una vez por sesión del navegador)',
          '1. Abre `GET /auth/test-token` más abajo, selecciona **Try it out** → **Execute** y copia el valor de `access_token` de la respuesta (solo funciona con `NODE_ENV = development`; usa el usuario del seed).',
          '2. Click en el botón **Authorize** 🔓 arriba a la derecha, pegá el token (sin la palabra "Bearer", Swagger la agrega sola) y confirmá.',
          '',
          'A partir de ahí, todos los endpoints protegidos ya salen con el candado cerrado — no hace falta repetirlo por cada uno. Si recargás la página, el token queda guardado y no hay que autenticarse de nuevo.',
        ].join('\n'),
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, swaggerConfig),
      {
        swaggerOptions: {
          persistAuthorization: true,
        },
      },
    );
  }

  await app.listen(config.getOrThrow<number>('PORT'));
}

void bootstrap();
