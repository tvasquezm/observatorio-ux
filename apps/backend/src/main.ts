import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
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
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('API Observatorio UX')
    .setDescription(
      [
        'API para estudios de investigación UX.',
        '',
        '### Cómo autenticarte acá (2 pasos, solo una vez por sesión de navegador)',
        '1. Abrí `GET /auth/test-token` más abajo, click **Try it out** → **Execute**, y copiá el valor de `access_token` de la respuesta (solo funciona con `NODE_ENV != production`, usa el usuario del seed).',
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
        // El token pegado en "Authorize" sobrevive a un F5 — sin esto,
        // recargar la página de Swagger obliga a repetir el paso 1-2 de
        // autenticación cada vez, que es justo la fricción más grande para
        // alguien que solo quiere probar un endpoint suelto.
        persistAuthorization: true,
      },
    },
  );

  await app.listen(config.getOrThrow<number>('PORT'));
}

void bootstrap();
