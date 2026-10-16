import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn() id: number;
  @Column() nombre: string;
  @Column() apellido: string;
  @Column({ default: '' }) email: string;
  @Column({ default: '' }) telefono: string;
  @Column() cedula: string;
  @Column({ nullable: true }) edad: number;
  @Column({ nullable: true }) sexo: string;
  @Column({ nullable: true }) estado_civil: string;
  @Column({ nullable: true }) ocupacion: string;
  @Column({ nullable: true }) residencia_actual: string;
  @Column({ nullable: true }) residencia_anterior: string;
  @Column({ nullable: true }) tipo_identificacion: string;
  @Column({ nullable: true }) fecha_nacimiento: string;
  @Column({ nullable: true }) nacionalidad: string;
  @Column({ nullable: true }) direccion_actual: string;
  @Column({ nullable: true }) contacto_emergencia: string;
  @Column({ nullable: true }) relacion_emergencia: string;
  @Column({ nullable: true }) telefono_emergencia: string;
  @Column({ nullable: true }) idioma_preferido: string;
  @Column({ nullable: true }) canal_contacto: string;
  @Column({ nullable: true }) profesional_referente: string;
  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }) created_at: Date;
}

@Entity('sucursales')
export class Branch {
  @PrimaryGeneratedColumn() id: number;
  @Column() nombre: string;
  @Column({ nullable: true }) direccion: string;
  @Column({ nullable: true }) telefono: string;
  @Column({ default: true }) activa: boolean;
}

@Entity('citas')
export class Appointment {
  @PrimaryGeneratedColumn() id: number;
  @Column({ nullable: true }) paciente_id: number;
  @Column() fecha: string;
  @Column() hora: string;
  @Column({ nullable: true }) descripcion: string;
  @Column({ type: 'text', nullable: true }) imagenes: string;
  @Column({ nullable: true }) ubicacion: string;
  @Column({ nullable: true }) sucursal_id: number;
  @Column({ default: 'Programada' }) estado: string;
}

@Entity('historia_clinica')
export class ClinicalRecord {
  @PrimaryGeneratedColumn() id: number;
  @Column({ nullable: true }) paciente_id: number;
  @Column({ nullable: true }) cita_id: number;
  @Column() fecha: string;
  @Column({ nullable: true }) motivo_consulta: string;
  @Column({ type: 'text', nullable: true }) antecedentes_enfermedades: string;
  @Column({ type: 'text', nullable: true }) medicamentos_habituales: string;
  @Column({ type: 'text', nullable: true }) habitos_nocivos: string;
  @Column({ type: 'text', nullable: true }) metodos_anticonceptivos: string;
  @Column({ type: 'text', nullable: true }) examen_fisico: string;
  @Column({ type: 'text', nullable: true }) diagnostico_definitivo: string;
  @Column({ type: 'text', nullable: true }) alergias: string;
  @Column({ type: 'text', nullable: true }) antecedentes_dermatologicos: string;
  @Column({ type: 'text', nullable: true }) antecedentes_familiares_dermatologicos: string;
  @Column({ type: 'text', nullable: true }) tratamientos_dermatologicos_previos: string;
  @Column({ type: 'text', nullable: true }) rutina_cuidado_piel: string;
  @Column({ nullable: true }) tipo_piel: string;
  @Column({ nullable: true }) fototipo: string;
  @Column({ type: 'text', nullable: true }) exposicion_solar: string;
  @Column({ nullable: true }) cicatrizacion_queloides: string;
  @Column({ nullable: true }) embarazo_lactancia: string;
  @Column({ nullable: true }) localizacion_lesion: string;
  @Column({ nullable: true }) tiempo_evolucion: string;
  @Column({ type: 'text', nullable: true }) descripcion_sintomas: string;
  @Column({ type: 'text', nullable: true }) sintomas_asociados: string;
  @Column({ type: 'text', nullable: true }) factores_desencadenantes: string;
  @Column({ type: 'text', nullable: true }) evolucion_desde_ultima: string;
  @Column({ type: 'text', nullable: true }) hallazgos_dermatologicos: string;
  @Column({ type: 'text', nullable: true }) valoracion_clinica: string;
  @Column({ type: 'text', nullable: true }) plan_tratamiento: string;
  @Column({ type: 'text', nullable: true }) indicaciones_paciente: string;
  @Column({ type: 'text', nullable: true }) estudios_solicitados: string;
  @Column({ type: 'text', nullable: true }) resultados_estudios: string;
  @Column({ nullable: true }) fecha_seguimiento: string;
  @Column({ type: 'text', nullable: true }) imagenes: string;
  @OneToMany(() => ClinicalPhotoConsent, consent => consent.record) consentimientos_fotograficos: ClinicalPhotoConsent[];
}

@Entity('consentimientos_fotograficos_clinicos')
export class ClinicalPhotoConsent {
  @PrimaryGeneratedColumn() id:number;
  @Column() paciente_id:number;
  @Column() record_id:number;
  @Column() firmante:string;
  @Column({nullable:true}) identificacion_firmante:string;
  @Column({nullable:true}) representante:string;
  @Column() documento_firmado:string;
  @Column({type:'datetime',default:()=> 'CURRENT_TIMESTAMP'}) firmado_en:Date;
  @Column() registrado_por:string;
  @Column({type:'datetime',nullable:true}) revocado_en:Date;
  @Column({nullable:true}) revocado_por:string;
  @ManyToOne(() => ClinicalRecord, record => record.consentimientos_fotograficos,{onDelete:'CASCADE'})
  @JoinColumn({name:'record_id'}) record:ClinicalRecord;
}

@Entity('public_cases')
export class PublicCase {
  @PrimaryGeneratedColumn() id: number;
  @Column() title: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ type: 'text' }) images: string;
  @Column({ default: false }) consent: boolean;
  @Column({ default: false }) published: boolean;
  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }) created_at: Date;
}

@Entity('store_products')
export class StoreProduct {
  @PrimaryGeneratedColumn() id:number;
  @Column() name:string;
  @Column({type:'text',nullable:true}) description:string;
  @Column({nullable:true}) price:string;
  @Column({nullable:true}) image_url:string;
  @Column({default:true}) active:boolean;
  @Column({type:'datetime',default:()=> 'CURRENT_TIMESTAMP'}) created_at:Date;
}
