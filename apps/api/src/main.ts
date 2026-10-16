import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { join } from 'path';
import { existsSync, createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { PROJECT_ROOT } from './project-root';
import Database from 'better-sqlite3';
import { JwtService } from '@nestjs/jwt';

async function bootstrap() {
  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes('cambia-esto') || !process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD || process.env.ADMIN_USER === 'usuario' || process.env.ADMIN_PASSWORD === 'contrasena' || !process.env.SECRETARY_USER || !process.env.SECRETARY_PASSWORD || process.env.SECRETARY_USER === 'secretaria' || process.env.SECRETARY_PASSWORD.includes('contrasena') || process.env.SECRETARY_PASSWORD.includes('cambia'))) {
    throw new Error('Production requires a random JWT_SECRET and unique credentials for both doctor and secretary accounts.');
  }
  const frontend = join(PROJECT_ROOT, 'apps/web/dist/clinic-web/browser');
  const server = express();
  server.use(express.json({ limit: '80mb' }));
  server.use(express.urlencoded({ extended: true, limit: '80mb' }));
  server.get('/api/media/:group/:id/:filename', async (req, res, next) => {
    const { group, id, filename } = req.params;
    if (!['appointments', 'records', 'consents', 'cases', 'products'].includes(group) || !/^\d+$/.test(id) || !/^[\w-]+\.(jpg|png|webp|gif|pdf)$/.test(filename) || (group==='consents'&&!filename.endsWith('.pdf')&&!/\.(jpg|png|webp)$/.test(filename))) return res.sendStatus(404);
    const path = join(PROJECT_ROOT, 'uploads', group, id, filename);
    try {
      if (group === 'appointments' || group === 'records' || group === 'consents') {
        const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
        if (!token) return res.sendStatus(401);
        try {
          const user = new JwtService({ secret: process.env.JWT_SECRET ?? 'cambia-este-secreto-antes-de-publicar-123456789' }).verify<{role:string}>(token);
          if ((group === 'records'||group==='consents') && user.role !== 'doctor') return res.sendStatus(403);
        } catch { return res.sendStatus(401); }
      } else if(group==='cases') {
        const db = new Database(join(PROJECT_ROOT, process.env.DB_PATH ?? 'agendamiento_clinico.db'), { readonly: true, fileMustExist: true });
        const result = db.prepare('SELECT images FROM public_cases WHERE id = ? AND consent = 1 AND published = 1').get(+id) as {images:string}|undefined;
        db.close();
        const approved: string[] = result ? JSON.parse(result.images || '[]') : [];
        if (!approved.includes(`/api/media/cases/${id}/${filename}`)) return res.sendStatus(404);
      } else if(group==='products') {
        const db = new Database(join(PROJECT_ROOT, process.env.DB_PATH ?? 'agendamiento_clinico.db'), { readonly: true, fileMustExist: true });
        const result=db.prepare('SELECT image_url FROM store_products WHERE id = ? AND active = 1').get(+id) as {image_url:string}|undefined;
        db.close();
        if(!result||result.image_url!==`/api/media/products/${id}/${filename}`)return res.sendStatus(404);
      } else {
        const db = new Database(join(PROJECT_ROOT, process.env.DB_PATH ?? 'agendamiento_clinico.db'), { readonly: true, fileMustExist: true });
        let paths:string[]=[];
        if(group==='records'){const approved=db.prepare('SELECT imagenes FROM historia_clinica WHERE id = ?').get(+id) as {imagenes:string}|undefined;paths=approved?JSON.parse(approved.imagenes||'[]'):[]}
        else {const approved=db.prepare('SELECT documento_firmado FROM consentimientos_fotograficos_clinicos WHERE record_id = ?').all(+id) as {documento_firmado:string}[];paths=approved.map(item=>item.documento_firmado)}
        db.close();
        if(!paths.includes(`/api/media/${group}/${id}/${filename}`))return res.sendStatus(404);
      }
      await stat(path); const type=filename.endsWith('.pdf')?'application/pdf':filename.endsWith('.jpg')?'image/jpeg':`image/${filename.split('.').pop()}`;createReadStream(path).pipe(res.type(type));
    }
    catch { next(); }
  });
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
