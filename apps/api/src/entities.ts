import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }) created_at: Date;
}

@Entity('citas')
export class Appointment {
  @PrimaryGeneratedColumn() id: number;
  @Column({ nullable: true }) paciente_id: number;
  @Column() fecha: string;
  @Column() hora: string;
  @Column({ nullable: true }) descripcion: string;
  @Column({ nullable: true }) ubicacion: string;
  @Column({ default: 'Programada' }) estado: string;
}

@Entity('historia_clinica')
export class ClinicalRecord {
  @PrimaryGeneratedColumn() id: number;
  @Column({ nullable: true }) paciente_id: number;
  @Column() fecha: string;
  @Column({ nullable: true }) motivo_consulta: string;
  @Column({ type: 'text', nullable: true }) antecedentes_enfermedades: string;
  @Column({ type: 'text', nullable: true }) medicamentos_habituales: string;
  @Column({ type: 'text', nullable: true }) habitos_nocivos: string;
  @Column({ type: 'text', nullable: true }) metodos_anticonceptivos: string;
  @Column({ type: 'text', nullable: true }) examen_fisico: string;
  @Column({ type: 'text', nullable: true }) diagnostico_definitivo: string;
}
