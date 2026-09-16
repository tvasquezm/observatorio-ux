import { BadRequestException, ValidationPipe, ValidationError } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

// CSRF (double-submit cookie): solo aplica a requests que ya traen la
// cookie httpOnly `evaluadorToken` (o sea, sesión de EVALUADOR autenticada
// por cookie) y a métodos mutantes. El flujo de PARTICIPANTE usa Bearer
// token (o, en el primer paso de acceso, ningún token todavía) — pero si
// el mismo navegador tiene además una sesión de EVALUADOR abierta (ej.
// alguien probando su propio link de participante en la misma pestaña),
// la cookie `evaluadorToken` viaja igual "de arrastre" en cualquier
// pedido al mismo origen, aunque el pedido no la use para autenticarse.
// Por eso se excluyen también:
//   - pedidos con `Authorization: Bearer` (no vulnerable a CSRF: un
//     navegador nunca adjunta ese header solo, a diferencia de una cookie).
//   - las rutas públicas de acceso de participante (`/auth/participants/*`),
//     que ni siquiera tienen token todavía en el primer paso y nunca se
//     autentican con la cookie de evaluador.
const METODOS_MUTANTES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PREFIJOS_EXENTOS_CSRF = ['/api/auth/participants'];

function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const tieneCookieDeSesion = Boolean((req as any).cookies?.evaluadorToken);
  const tieneBearer = Boolean(req.header('authorization'));
  const esRutaExenta = PREFIJOS_EXENTOS_CSRF.some((prefijo) => req.path.startsWith(prefijo));
  if (!METODOS_MUTANTES.has(req.method) || !tieneCookieDeSesion || tieneBearer || esRutaExenta) {
    next();
    return;
  }

  const headerToken = req.header('x-csrf-token');
  const cookieToken = (req as any).cookies?.csrfToken;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    res.status(403).json({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Token CSRF inválido o ausente.',
    });
    return;
  }

  next();
}

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

  if (config.get<string>('app.nodeEnv') === 'production') {
    // El compose coloca exactamente un Nginx delante del backend. Limitar
    // la confianza a un salto mantiene req.ip útil para throttling sin
    // aceptar una cadena X-Forwarded-For arbitraria enviada por el cliente.
    app.set('trust proxy', 1);
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
          '1. Abre `GET /auth/test-token` más abajo, selecciona **Try it out** → **Execute** y copia el valor de `access_token` de la respuesta (solo funciona con `NODE_ENV != production`; usa el usuario del seed).',
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
