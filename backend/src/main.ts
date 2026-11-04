import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Increase payload limit for base64 chart snapshots and report exports
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Global prefix for all REST endpoints
  app.setGlobalPrefix('api/v1');

  // Input validation and transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS for frontend requests
  const corsOriginsEnv = process.env.CORS_ORIGINS;
  let originConfig: boolean | string | string[] = true;
  if (corsOriginsEnv && corsOriginsEnv.trim() !== '' && corsOriginsEnv !== '*') {
    originConfig = corsOriginsEnv.split(',').map((o) => o.trim());
  }

  app.enableCors({
    origin: originConfig,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Disposition'],
  });

  const port = process.env.PORT || 4000;
  // Bind to 0.0.0.0 to ensure accessibility within Docker/Render/cloud container environments
  await app.listen(port, '0.0.0.0');
  console.log(`🥋 Jiu-Jitsu Backend API running on port ${port} (bind: 0.0.0.0)`);
}

bootstrap();

