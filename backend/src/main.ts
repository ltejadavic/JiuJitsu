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

  // Input validation and transformation (whitelist strips unknown fields cleanly)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS for frontend requests
  const corsOriginsEnv = process.env.CORS_ORIGINS;
  const configuredOrigins = corsOriginsEnv
    ? corsOriginsEnv.split(',').map((o) => o.trim().replace(/\/+$/, ''))
    : [];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      // Always allow local development
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }

      // Allow all Vercel deployment domains (production and deployment previews)
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      // Allow configured origins or wildcard
      if (
        configuredOrigins.length === 0 ||
        configuredOrigins.includes('*') ||
        configuredOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(null, false);
    },
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

