import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Prefijo global para las rutas
  app.setGlobalPrefix('api');

  // 2. Seguridad Estricta (La aportación de tu compañero)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina campos no definidos en el DTO/Zod
      transform: true, // Transforma strings a números automáticamente si el DTO lo pide
      forbidNonWhitelisted: true, // Lanza error 400 si alguien envía campos extra
    }),
  );

  // 3. Documentación Autogenerada (Swagger)
  const config = new DocumentBuilder()
    .setTitle('API Observatorio UX')
    .setDescription('Documentación interactiva de los endpoints para la UTEM')
    .setVersion('1.0')
    .addBearerAuth() // Habilita el botón verde "Authorize" para probar con JWT
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 4. Configuración de Puerto Dinámico
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Observatorio UX Backend iniciado en puerto ${port}`);
  console.log(`📑 Postman Interactivo (Swagger) en: http://localhost:${port}/api/docs`);
}

bootstrap();