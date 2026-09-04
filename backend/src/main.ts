import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // @nestjs/config no vuelca las variables del .env a process.env — hay que
  // leerlas siempre vía ConfigService (mismo patrón que ya usa PrismaService).
  const configService = app.get(ConfigService);

  const frontendUrl = configService.get<string>('FRONTEND_URL');
  const isProd = configService.get<string>('NODE_ENV') === 'production';
  if (isProd && !frontendUrl) {
    // Sin esto, CORS caería en silencio a localhost:4200 y el frontend de
    // producción quedaría bloqueado sin ningún error visible.
    throw new Error(
      'FRONTEND_URL es obligatoria en producción (configura el CORS).',
    );
  }

  app.enableCors({ origin: frontendUrl ?? 'http://localhost:4200' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(configService.get<string>('PORT') ?? 3000);
}
bootstrap();
