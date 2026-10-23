import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { Appointment, Branch, ClinicalPhotoConsent, ClinicalRecord, Patient, PublicCase, StoreProduct, DermatologyTreatment, DermatologyProcedure, ClinicalPhoto, ProcedureConsent, PublicationConsent } from './entities';
import { JwtGuard } from './auth/jwt.guard';
import { RolesGuard } from './auth/roles.guard';
import { PROJECT_ROOT } from './project-root';
import { resolve } from 'path';

@Module({
  imports: [
    TypeOrmModule.forRoot({ type: 'better-sqlite3', database: resolve(PROJECT_ROOT, process.env.DB_PATH ?? 'agendamiento_clinico.db'), entities: [Patient, Appointment, Branch, ClinicalRecord, ClinicalPhotoConsent, PublicCase, StoreProduct, DermatologyTreatment, DermatologyProcedure, ClinicalPhoto, ProcedureConsent, PublicationConsent], synchronize: true }),
    TypeOrmModule.forFeature([Patient, Appointment, Branch, ClinicalRecord, ClinicalPhotoConsent, PublicCase, StoreProduct, DermatologyTreatment, DermatologyProcedure, ClinicalPhoto, ProcedureConsent, PublicationConsent]),
    JwtModule.register({ secret: process.env.JWT_SECRET ?? 'cambia-este-secreto-antes-de-publicar-123456789', signOptions: { expiresIn: '8h' } }),
  ],
  controllers: [AppController], providers: [JwtGuard, RolesGuard],
})
export class AppModule {}
