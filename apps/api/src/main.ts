import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { PROJECT_ROOT } from './project-root';

async function bootstrap() {
  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes('cambia-esto') || !process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD || process.env.ADMIN_USER === 'usuario' || process.env.ADMIN_PASSWORD === 'contrasena' || !process.env.SECRETARY_USER || !process.env.SECRETARY_PASSWORD || process.env.SECRETARY_USER === 'secretaria' || process.env.SECRETARY_PASSWORD.includes('contrasena') || process.env.SECRETARY_PASSWORD.includes('cambia'))) {
    throw new Error('Production requires a random JWT_SECRET and unique credentials for both doctor and secretary accounts.');
  }
  const frontend = join(PROJECT_ROOT, 'apps/web/dist/clinic-web/browser');
  const server = express();
  server.use(express.static(frontend, { index: false }));
  server.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/') && req.path !== '/' && !req.path.includes('.')) {
      const index = join(frontend, 'index.html');
      if (existsSync(index)) return res.sendFile(index);
      return res.redirect(`${process.env.WEB_DEV_URL ?? 'http://localhost:4200'}${req.path}`);
    }
    next();
  });
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(server));
  app.setGlobalPrefix('');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? (process.env.NODE_ENV === 'production' ? process.env.PUBLIC_URL : true), credentials: true });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
