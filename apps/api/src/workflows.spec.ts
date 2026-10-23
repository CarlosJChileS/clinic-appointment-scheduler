import 'reflect-metadata';
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import * as entities from './entities';
import { JwtGuard } from './auth/jwt.guard';
import { RolesGuard } from './auth/roles.guard';
import { mediaHandler } from './media';
import { unlink, mkdtemp, readdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { PROJECT_ROOT } from './project-root';
const createdFiles=new Set<string>();

let app:any, db:DataSource, base:string, doctor:string, secretary:string;
let patient:any, branch:any;
const pdf={type:'application/pdf',data:Buffer.from('%PDF test signed copy').toString('base64'),firmado:true,firmante:'Paciente',identificacion_firmante:'ID-1'};
const photo={type:'image/png',data:Buffer.from('fixture image').toString('base64'),vista:'Detalle',zona:'Brazo',fecha_captura:'2026-10-23'};
async function api(path:string,method='GET',body?:any,token=doctor){
  const res=await fetch(base+'/api/'+path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const result=await res.json();const collect=(v:any)=>{if(typeof v==='string'){if(v.startsWith('/api/media/')&&!v.endsWith('/legacy.png'))createdFiles.add(v);else if(v.startsWith('[')){try{collect(JSON.parse(v));}catch{}}}else if(v&&typeof v==='object')Object.values(v).forEach(collect);};collect(result);return {status:res.status,body:result};
}
async function record(){return db.getRepository(entities.ClinicalRecord).save({paciente_id:patient.id,fecha:'2026-10-23',imagenes:'[]'});}
async function appointment(){return db.getRepository(entities.Appointment).save({paciente_id:patient.id,sucursal_id:branch.id,fecha:'2026-10-23',hora:'10:00',estado:'Programada'});}
before(async()=>{
  const models=Object.values(entities).filter(value=>typeof value==='function');
  const module=await Test.createTestingModule({imports:[TypeOrmModule.forRoot({type:'better-sqlite3',database:':memory:',entities:models,synchronize:true}),TypeOrmModule.forFeature(models),JwtModule.register({secret:'workflow-tests'})],controllers:[AppController],providers:[JwtGuard,RolesGuard]}).compile();
  app=module.createNestApplication();app.useLogger(false);app.getHttpAdapter().getInstance().get('/api/media/:group/:id/:filename',mediaHandler(()=>db,app.get(JwtService))); await app.listen(0,'127.0.0.1');base=await app.getUrl();db=app.get(DataSource);
  const jwt=app.get(JwtService);doctor=jwt.sign({sub:'doctor-test',role:'doctor'});secretary=jwt.sign({sub:'secretary-test',role:'secretary'});
});
beforeEach(async()=>{await db.synchronize(true);patient=await db.getRepository(entities.Patient).save({nombre:'Ana',apellido:'Prueba',cedula:'TEST'});branch=await db.getRepository(entities.Branch).save({nombre:'Clínica'});});
after(async()=>{if(app)await app.close();await Promise.all([...createdFiles].map(path=>unlink(join(PROJECT_ROOT,'uploads',...path.split('/').slice(3))).catch(()=>{})));});

test('Otro appointment requires and preserves a trimmed description on create and patch',async()=>{
 const body={paciente_id:patient.id,sucursal_id:branch.id,fecha:'2026-10-23',hora:'10:00',duracion_minutos:30,tipo_consulta:'Otro',motivo_consulta:'Consulta'};
 assert.equal((await api('appointments','POST',body)).status,400);
 const created=await api('appointments','POST',{...body,tipo_consulta_otro:'  Revisión  '});assert.equal(created.status,201);assert.equal(created.body.tipo_consulta_otro,'Revisión');
 assert.equal((await api(`appointments/${created.body.id}`,'PATCH',{tipo_consulta_otro:' '})).status,400);
});
test('linked encounter commits record and attended appointment once and rejects patient mismatch',async()=>{
 const a=await appointment();const path=`appointments/${a.id}/record`;
 assert.equal((await api(path,'POST',{paciente_id:patient.id+1,fecha:'2026-10-23'})).status,400);
 const result=await api(path,'POST',{paciente_id:patient.id,fecha:'2026-10-23',fecha_seguimiento:'2026-11-01'});
 assert.equal(result.status,201);assert.equal(result.body.record.cita_id,a.id);assert.equal(result.body.appointment.estado,'Atendida');assert.equal(result.body.record.seguimiento_estado,'Pendiente');
 assert.equal((await api(path,'POST',{paciente_id:patient.id,fecha:'2026-10-23'})).status,400);assert.equal(await db.getRepository(entities.ClinicalRecord).count(),1);
});
test('SQLite rolls linked encounter back on invalid input and database update failure',async()=>{
 const a=await appointment();
 assert.equal((await api(`appointments/${a.id}/record`,'POST',{paciente_id:patient.id,fecha:'invalid'})).status,400);
 await db.query("CREATE TRIGGER reject_attended BEFORE UPDATE ON citas WHEN NEW.estado = 'Atendida' BEGIN SELECT RAISE(ABORT, 'forced rollback'); END");
 assert.equal((await api(`appointments/${a.id}/record`,'POST',{paciente_id:patient.id,fecha:'2026-10-23'})).status,500);
 assert.equal(await db.getRepository(entities.ClinicalRecord).count(),0);assert.equal((await db.getRepository(entities.Appointment).findOneByOrFail({id:a.id})).estado,'Programada');
});
test('legacy follow-up defaults pending and only valid explicit states persist',async()=>{
 const r=await record();await db.query('UPDATE historia_clinica SET fecha_seguimiento = ? WHERE id = ?',['2026-11-01',r.id]);
 const list=await api('records');assert.equal(list.body[0].seguimiento_estado,'Pendiente');
 assert.equal((await api(`records/${r.id}`,'PATCH',{motivo_consulta:'Actualización de registro antiguo'})).status,200);
 assert.equal((await api(`records/${r.id}`,'PATCH',{seguimiento_estado:'Realizado'})).body.seguimiento_estado,'Realizado');
 assert.equal((await api(`records/${r.id}`,'PATCH',{seguimiento_estado:'Inventado'})).status,400);
});
test('structured treatment CRUD is owned by record and restricted to doctor',async()=>{
 const r=await record(), other=await record();const path=`records/${r.id}/treatments`;
 const treatment={producto:'Producto indicado',concentracion:'Según registro',presentacion:'Crema',cantidad:'Una',via:'Tópica',frecuencia:'Según indicación',duracion:'7 días',indicaciones:'Texto de la doctora'};
 assert.equal((await api(path,'POST',treatment,secretary)).status,403);
 const created=await api(path,'POST',treatment);assert.equal(created.status,201);assert.equal(created.body.producto,treatment.producto);
 assert.equal((await api(`records/${other.id}/treatments/${created.body.id}`,'PATCH',{producto:'Otro'})).status,404);
 assert.equal((await api(path+`/${created.body.id}`,'PATCH',{indicaciones:'Actualizado'})).body.indicaciones,'Actualizado');
 assert.equal((await api(path)).body.length,1);assert.equal((await api(path+`/${created.body.id}`,'DELETE')).status,200);
});
test('procedure performance requires signed discussion consent and confirmation on procedure date',async()=>{
 const r=await record();const path=`records/${r.id}/procedures`;
 const created=await api(path,'POST',{tipo:'Biopsia',fecha:'2026-10-23',zona:'Brazo'});assert.equal(created.status,201);assert.equal(created.body.estado,'Planificado');assert.equal(created.body.biopsia_estado,'No solicitada');
 const p=path+`/${created.body.id}`;assert.equal((await api(p,'PATCH',{estado:'Realizado'})).status,400);
 const c=await api(p+'/consents','POST',{...pdf,fecha_conversacion:'2026-10-22',beneficios:'Conversados',riesgos:'Conversados',alternativas:'Conversadas',oportunidad_preguntas:true,comprension_confirmada:true});assert.equal(c.status,201);
 assert.equal((await api(p,'PATCH',{estado:'Realizado'})).status,400);
 assert.equal((await api(p+`/consents/${c.body.id}/confirm`,'PATCH',{fecha_confirmacion:'2026-10-22'})).status,400);
 assert.equal((await api(p+`/consents/${c.body.id}/confirm`,'PATCH',{fecha_confirmacion:'2026-10-23'})).status,200);
 assert.equal((await api(p,'PATCH',{estado:'Realizado'})).body.estado,'Realizado');
 assert.equal((await api(p,'PATCH',{estado:'Invalid'})).status,400);
});
test('biopsy results and communication require their evidence fields',async()=>{
 const r=await record();const path=`records/${r.id}/procedures`;
 const p=await api(path,'POST',{tipo:'Biopsia',fecha:'2026-10-23',zona:'Brazo',biopsia_estado:'Solicitada'});assert.equal(p.status,201);const url=path+'/'+p.body.id;
 assert.equal((await api(url,'PATCH',{biopsia_estado:'Resultado disponible'})).status,400);
 assert.equal((await api(url,'PATCH',{biopsia_estado:'Resultado disponible',biopsia_resultado:'Texto recibido',biopsia_resultado_fecha:'2026-10-24'})).status,200);
 assert.equal((await api(url,'PATCH',{biopsia_estado:'Comunicada'})).status,400);
 assert.equal((await api(url,'PATCH',{biopsia_estado:'Comunicada',comunicacion_fecha:'2026-10-25',comunicacion_destinatario:'Paciente',comunicacion_canal:'Llamada'})).status,200);
});
test('tagged clinical photos require active signed consent while legacy paths remain unclassified',async()=>{
 const r=await record();const path=`records/${r.id}`;
 assert.equal((await api(path+'/photos','POST',{images:[photo]})).status,400);
 const consent=await api(path+'/photo-consents','POST',pdf);assert.equal(consent.status,201);
 const uploaded=await api(path+'/photos','POST',{images:[photo]});assert.equal(uploaded.status,201);assert.equal(uploaded.body[0].vista,'Detalle');
 await db.query('UPDATE historia_clinica SET imagenes = ? WHERE id = ?',[JSON.stringify(['/api/media/records/'+r.id+'/legacy.png']),r.id]);
 const photos=await api(path+'/photos');assert.ok(photos.body.some((x:any)=>x.vista==='Sin clasificar'));assert.ok(photos.body.some((x:any)=>x.vista==='Detalle'));
 await api(path+`/photo-consents/${consent.body.id}/revoke`,'PATCH');assert.equal((await api(path+'/photos','POST',{images:[photo]})).status,400);
 assert.equal((await api(path+'/photos/'+uploaded.body[0].id,'DELETE')).status,200);
});
test('public cases require separate active signed publication consent and revocation unpublishes',async()=>{
 const c=await db.getRepository(entities.PublicCase).save({title:'General case',description:'Descripción general',images:'[]',consent:true,published:true});
 assert.deepEqual((await api('public-cases','GET',undefined,'')).body,[]);
 const consent=await api(`cases/${c.id}/publication-consents`,'POST',pdf);assert.equal(consent.status,201);
 const visible=await api('public-cases','GET',undefined,'');assert.equal(visible.body.length,1);assert.equal(visible.body[0].firmante,undefined);
 await api(`cases/${c.id}/publication-consents/${consent.body.id}/revoke`,'PATCH');assert.deepEqual((await api('public-cases','GET',undefined,'')).body,[]);assert.equal((await db.getRepository(entities.PublicCase).findOneByOrFail({id:c.id})).published,false);
});
test('clinical and consent endpoints reject secretary and unauthenticated access',async()=>{
 const r=await record();for(const path of [`records/${r.id}/photos`,`records/${r.id}/procedures`,`records/${r.id}/treatments`,`records/${r.id}/photo-consents`]){
 assert.equal((await api(path,'GET',undefined,secretary)).status,403);assert.equal((await api(path,'GET',undefined,'')).status,401);
 }
});
test('media routes require doctor access and row ownership, preserving revoked clinical history',async()=>{
 const r=await record();const path=`records/${r.id}`;
 const consent=await api(path+'/photo-consents','POST',pdf);
 const uploaded=await api(path+'/photos','POST',{images:[photo]});
 const url=base+uploaded.body[0].ruta;
 assert.equal((await fetch(url)).status,401);
 assert.equal((await fetch(url,{headers:{authorization:'Bearer '+secretary}})).status,403);
 assert.equal((await fetch(url,{headers:{authorization:'Bearer '+doctor}})).status,200);
 assert.equal((await fetch(base+consent.body.documento_firmado,{headers:{authorization:'Bearer '+secretary}})).status,403);
 assert.equal((await fetch(base+consent.body.documento_firmado,{headers:{authorization:'Bearer '+doctor}})).status,200);
 await api(path+`/photo-consents/${consent.body.id}/revoke`,'PATCH');
 assert.equal((await fetch(url,{headers:{authorization:'Bearer '+doctor}})).status,200);
 const other=await record();const moved=uploaded.body[0].ruta.replace(`/records/${r.id}/`,`/records/${other.id}/`);
 assert.equal((await fetch(base+moved,{headers:{authorization:'Bearer '+doctor}})).status,404);
 await db.getRepository((entities as any).ClinicalPhoto).delete(uploaded.body[0].id);await db.getRepository(entities.ClinicalRecord).update(r.id,{imagenes:'[]'});
 assert.equal((await fetch(url,{headers:{authorization:'Bearer '+doctor}})).status,404);
});
test('public image delivery enforces publication evidence and keeps consent PDFs private',async()=>{
 const c=await api('cases','POST',{title:'Public image',consent:true});
 const image=await api(`cases/${c.body.id}/images`,'POST',{images:[photo]});const imagePath=JSON.parse(image.body.images)[0];
 await db.getRepository(entities.PublicCase).update(c.body.id,{published:true});
 assert.equal((await fetch(base+imagePath)).status,404);
 const consent=await api(`cases/${c.body.id}/publication-consents`,'POST',pdf);
 assert.equal((await fetch(base+imagePath)).status,200);
 assert.equal((await fetch(base+consent.body.documento_firmado)).status,401);
 assert.equal((await fetch(base+consent.body.documento_firmado,{headers:{authorization:'Bearer '+secretary}})).status,403);
 assert.equal((await fetch(base+consent.body.documento_firmado,{headers:{authorization:'Bearer '+doctor}})).status,200);
 await api(`cases/${c.body.id}/publication-consents/${consent.body.id}/revoke`,'PATCH');
 assert.equal((await fetch(base+imagePath)).status,404);
 assert.equal((await fetch(base+consent.body.documento_firmado,{headers:{authorization:'Bearer '+doctor}})).status,200);
});
test('legacy clinical photos remain read-only through the old delete endpoint',async()=>{
 const r=await record();const legacy=`/api/media/records/${r.id}/legacy.png`;await db.getRepository(entities.ClinicalRecord).update(r.id,{imagenes:JSON.stringify([legacy])});
 assert.equal((await api(`records/${r.id}/images`,'DELETE',{image:legacy})).status,400);
 assert.equal((await db.getRepository(entities.ClinicalRecord).findOneByOrFail({id:r.id})).imagenes,JSON.stringify([legacy]));
});
test('additive synchronization preserves legacy rows and photo paths across SQLite reopen',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'clinic-workflows-'));const database=join(directory,'legacy.sqlite');
 const models=Object.values(entities).filter(value=>typeof value==='function');
 let legacy=new DataSource({type:'better-sqlite3',database,entities:models});
 try{
  await legacy.initialize();await legacy.query('CREATE TABLE historia_clinica (id integer PRIMARY KEY, paciente_id integer, fecha varchar NOT NULL, fecha_seguimiento varchar, imagenes text)');
  await legacy.query('INSERT INTO historia_clinica VALUES (7, 4, ?, ?, ?)', ['2025-01-01','2025-02-01','["/api/media/records/7/old.png"]']);
  await legacy.synchronize();await legacy.destroy();
  legacy=new DataSource({type:'better-sqlite3',database,entities:models,synchronize:true});await legacy.initialize();
  const saved=await legacy.getRepository(entities.ClinicalRecord).findOneByOrFail({id:7});assert.equal(saved.imagenes,'["/api/media/records/7/old.png"]');assert.equal(saved.fecha_seguimiento,'2025-02-01');assert.equal(saved.paciente_id,4);
 }finally{if(legacy.isInitialized)await legacy.destroy();await rm(directory,{recursive:true,force:true});}
});
test('photo batch validation and SQLite failure leave no partial files or photo rows',async()=>{
 const r=await record();await api(`records/${r.id}/photo-consents`,'POST',pdf);const directory=join(PROJECT_ROOT,'uploads','records',String(r.id));
 const before=await readdir(directory).catch(()=>[]);
 assert.equal((await api(`records/${r.id}/photos`,'POST',{images:[photo,{...photo,vista:'Invalid'}]})).status,400);
 assert.deepEqual(await readdir(directory).catch(()=>[]),before);
 await db.query("CREATE TRIGGER reject_photos BEFORE INSERT ON fotografias_clinicas BEGIN SELECT RAISE(ABORT, 'forced photo rollback'); END");
 assert.equal((await api(`records/${r.id}/photos`,'POST',{images:[photo]})).status,500);
 assert.deepEqual(await readdir(directory).catch(()=>[]),before);assert.equal(await db.getRepository((entities as any).ClinicalPhoto).count(),0);
 assert.equal((await db.getRepository(entities.ClinicalRecord).findOneByOrFail({id:r.id})).imagenes,'[]');
});
test('procedure consent files and nested operations enforce owning record and doctor role',async()=>{
 const r=await record(),other=await record();const path=`records/${r.id}/procedures`;
 const p=await api(path,'POST',{tipo:'Procedimiento',fecha:'2026-10-23',zona:'Brazo'});const url=path+'/'+p.body.id;
 const consent=await api(url+'/consents','POST',{...pdf,fecha_conversacion:'2026-10-22',beneficios:'Conversados',riesgos:'Conversados',alternativas:'Conversadas',oportunidad_preguntas:true,comprension_confirmada:true});
 for(const token of [secretary,''])assert.equal((await fetch(base+consent.body.documento_firmado,{headers:token?{authorization:'Bearer '+token}:{}})).status,token?403:401);
 assert.equal((await fetch(base+consent.body.documento_firmado,{headers:{authorization:'Bearer '+doctor}})).status,200);
 assert.equal((await api(`records/${other.id}/procedures/${p.body.id}/consents`)).status,404);
 assert.equal((await api(`records/${other.id}/procedures/${p.body.id}/consents/${consent.body.id}/confirm`,'PATCH',{fecha_confirmacion:'2026-10-23'})).status,404);
 assert.equal((await api(url+'/consents','GET',undefined,secretary)).status,403);
 assert.equal((await api(url,'PATCH',{estado:'Cancelado'},secretary)).status,403);
});
test('publication consent lists and revocation enforce owner and doctor role',async()=>{
 const c=await api('cases','POST',{title:'Caso'}),other=await api('cases','POST',{title:'Otro'});
 const path=`cases/${c.body.id}/publication-consents`;const consent=await api(path,'POST',pdf);
 assert.equal((await api(path,'GET',undefined,secretary)).status,403);assert.equal((await api(path,'GET',undefined,'')).status,401);
 assert.equal((await api(path+`/${consent.body.id}/revoke`,'PATCH',{},secretary)).status,403);
 assert.equal((await api(`cases/${other.body.id}/publication-consents/${consent.body.id}/revoke`,'PATCH')).status,404);
 assert.equal((await api(path)).body[0].revocado_en,null);
});
test('all exact photo views persist and the legacy upload cannot invent a classification',async()=>{
 const r=await record();await api(`records/${r.id}/photo-consents`,'POST',pdf);
 assert.equal((await api(`records/${r.id}/images`,'POST',{images:[{type:photo.type,data:photo.data}]})).status,400);
 const views=['Panorámica','Comparación','Detalle'];
 const saved=await api(`records/${r.id}/photos`,'POST',{images:views.map(vista=>({...photo,vista}))});
 assert.equal(saved.status,201);assert.deepEqual(saved.body.map((p:any)=>p.vista),views);
});
