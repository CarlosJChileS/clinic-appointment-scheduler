import { RequestHandler } from 'express';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { join } from 'path';
import { stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { Appointment, ClinicalPhoto, ClinicalPhotoConsent, ClinicalRecord, ProcedureConsent, PublicationConsent, PublicCase, StoreProduct } from './entities';
import { PROJECT_ROOT } from './project-root';

/** Shares the exact media authorization path between production and HTTP tests. */
export function mediaHandler(source:()=>DataSource,jwt:JwtService,root=PROJECT_ROOT):RequestHandler {
  return async(req,res)=>{
    const group=String(req.params.group),id=String(req.params.id),filename=String(req.params.filename);
    const privateGroups=['appointments','records','consents','procedure-consents','publication-consents'];
    if(![...privateGroups,'cases','products'].includes(group)||!/^[1-9]\d*$/.test(id)||!/^[\w-]+\.(jpg|png|webp|gif|pdf)$/.test(filename))return void res.sendStatus(404);
    if(privateGroups.includes(group)){
      const token=req.headers.authorization?.replace(/^Bearer\s+/i,'');if(!token)return void res.sendStatus(401);
      try{const user=jwt.verify<{role:string}>(token);if(group!=='appointments'&&user.role!=='doctor')return void res.sendStatus(403);}catch{return void res.sendStatus(401);}
    }
    const ruta=`/api/media/${group}/${id}/${filename}`;
    try{
      const db=source();let approved=false;
      if(group==='appointments'){
        const row=await db.getRepository(Appointment).findOneBy({id:+id});approved=!!row&&JSON.parse(row.imagenes||'[]').includes(ruta);
      }else if(group==='records'){
        const row=await db.getRepository(ClinicalRecord).findOneBy({id:+id});approved=!!row&&(JSON.parse(row.imagenes||'[]').includes(ruta)||await db.getRepository(ClinicalPhoto).existsBy({record_id:+id,ruta}));
      }else if(group==='consents')approved=await db.getRepository(ClinicalPhotoConsent).existsBy({record_id:+id,documento_firmado:ruta});
      else if(group==='procedure-consents')approved=await db.getRepository(ProcedureConsent).existsBy({record_id:+id,documento_firmado:ruta});
      else if(group==='publication-consents')approved=await db.getRepository(PublicationConsent).existsBy({case_id:+id,documento_firmado:ruta});
      else if(group==='cases'){
        const row=await db.getRepository(PublicCase).createQueryBuilder('c').where('c.id = :id AND c.consent = :yes AND c.published = :yes',{id:+id,yes:true}).andWhere("EXISTS (SELECT 1 FROM consentimientos_publicacion pc WHERE pc.case_id = c.id AND pc.revocado_en IS NULL AND TRIM(pc.documento_firmado) <> '')").getOne();
        approved=!filename.endsWith('.pdf')&&!!row&&JSON.parse(row.images||'[]').includes(ruta);
      }else if(group==='products')approved=await db.getRepository(StoreProduct).existsBy({id:+id,active:true,image_url:ruta});
      if(!approved)return void res.sendStatus(404);
      const path=join(root,'uploads',group,id,filename);await stat(path);
      res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
      const type=filename.endsWith('.pdf')?'application/pdf':filename.endsWith('.jpg')?'image/jpeg':`image/${filename.split('.').pop()}`;
      const stream=createReadStream(path);stream.on('error',()=>{if(!res.headersSent)res.sendStatus(404);else res.destroy();});stream.pipe(res.type(type));
    }catch{return void res.sendStatus(404);}
  };
}
