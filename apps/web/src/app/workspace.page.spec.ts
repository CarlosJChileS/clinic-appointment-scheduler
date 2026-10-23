import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { WorkspacePage } from './workspace.page';

describe('WorkspacePage clinical workflows', () => {
  let page: WorkspacePage;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ section: 'appointments' })), snapshot: { data: {} } } },
        { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
        { provide: AuthService, useValue: { isDoctor: () => true, displayName: () => 'Dra. Prueba' } },
      ],
    });
    page = TestBed.runInInjectionContext(() => new WorkspacePage());
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.match(() => true).forEach(request => request.flush({}));
    http.verify();
    TestBed.resetTestingModule();
  });

  it('selects a patient created inline into the booking form', () => {
    expect((page as any).quickPatientForm).toBeDefined();
    expect(typeof (page as any).filteredFollowUps).toBe('function');
    const quickForm = (page as any).quickPatientForm;
    quickForm.setValue({ nombre: 'Ana', apellido: 'Paz', cedula: '0912345678', telefono: '0991234567', email: '' });

    (page as any).createBookingPatient();

    const request = http.expectOne('/api/patients');
    expect(request.request.method).toBe('POST');
    request.flush({ id: 41, nombre: 'Ana', apellido: 'Paz', cedula: '0912345678', telefono: '0991234567', email: '' });
    expect(page.appointmentForm.controls.paciente_id.value).toBe('41');
    expect(page.patients.some(patient => patient.id === 41)).toBe(true);
  });

  it('requires a description when the appointment type is Otro', () => {
    page.appointmentForm.patchValue({ paciente_id: '3', sucursal_id: '1', fecha: '2026-10-23', hora: '09:00', motivo_consulta: 'Consulta', tipo_consulta: 'Otro' });
    expect(page.appointmentForm.get('tipo_consulta_otro')).not.toBeNull();
    expect(page.appointmentForm.valid).toBe(false);
    page.appointmentForm.patchValue({ tipo_consulta_otro: 'Evaluación de lesión' } as any);
    expect(page.appointmentForm.valid).toBe(true);
  });

  it('links an encounter through the atomic appointment route without a separate state patch', () => {
    (page as any).activeRecordAppointmentId = 7;
    page.recordForm.patchValue({ paciente_id: '3', fecha: '2026-10-23', motivo_consulta: 'Control' });

    page.createRecord();

    const request = http.expectOne('/api/appointments/7/record');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.paciente_id).toBe(3);
    request.flush({ record: { id: 12 }, appointment: { id: 7, estado: 'Atendida' } });
    http.expectNone('/api/appointments/7');
  });

  it('classifies legacy follow-ups as pending and transitions a follow-up to complete', () => {
    (page as any).records = [
      { id: 1, paciente_id: 3, fecha: '2026-10-01', motivo_consulta: '', diagnostico_definitivo: '', fecha_seguimiento: '2026-10-22' },
      { id: 2, paciente_id: 4, fecha: '2026-10-01', motivo_consulta: '', diagnostico_definitivo: '', fecha_seguimiento: '2026-10-25', seguimiento_estado: 'Pendiente' },
    ];
    expect((page as any).filteredFollowUps('overdue').map((record: any) => record.id)).toEqual([1]);

    (page as any).completeFollowUp((page as any).records[0]);

    const request = http.expectOne('/api/records/1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ seguimiento_estado: 'Realizado' });
  });

  it('keeps photo view, zone, and capture date metadata available for longitudinal comparison', () => {
    const photo = { id: 8, record_id: 2, ruta: '/api/records/2/photos/8', vista: 'Comparación', zona: 'Mejilla derecha', fecha_captura: '2026-10-23' };
    (page as any).clinicalPhotos = { 2: [photo] };
    expect((page as any).photosForComparison(2)).toEqual([photo]);
    expect((page as any).photoLabel(photo)).toContain('Mejilla derecha');
    expect((page as any).photoLabel(photo)).toContain('23/10/2026');
    (page as any).togglePhotoComparison(2, 8, true);
    expect((page as any).selectedPhotoComparison(2)).toEqual([photo]);
  });

  it('saves structured treatment fields under the selected clinical record', () => {
    const record = { id: 2, paciente_id: 3, fecha: '2026-10-23', motivo_consulta: '', diagnostico_definitivo: '' } as any;
    page.treatmentForm.patchValue({ producto: 'Crema', concentracion: '2%', presentacion: 'Crema', cantidad: '30 g', via: 'Tópica', frecuencia: 'Noche', duracion: '14 días', indicaciones: 'Aplicar en zona indicada' });

    page.saveTreatment(record);

    const request = http.expectOne('/api/records/2/treatments');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({ producto: 'Crema', concentracion: '2%', frecuencia: 'Noche', duracion: '14 días' });
    request.flush({ id: 9 });
  });

  it('blocks a procedure from being marked complete without confirmed signed consent for its date', () => {
    const record = { id: 2, paciente_id: 3 } as any;
    const procedure = { id: 6, record_id: 2, tipo: 'Biopsia', fecha: '2026-10-23', estado: 'Planificado' } as any;
    (page as any).proceduresConsents = { 6: [{ id: 13, firmante: 'Ana Paz', documento_firmado: '/private/signed.pdf', fecha_confirmacion: '2026-10-23', oportunidad_preguntas: false, comprension_confirmada: true }] };

    page.updateProcedure(record, procedure, 'estado', 'Realizado');

    expect(page.error).toContain('Confirma el consentimiento firmado');
    http.expectNone('/api/records/2/procedures/6');
  });

  it('refuses publication when a case has no signed publication evidence', () => {
    const item = { id: 11, title: 'Caso', description: '', images: '[]', consent: false, published: false };

    page.publishCase(item);

    expect(page.error).toContain('autorización específica firmada');
    http.expectNone('/api/cases/11');
  });

  it('sends view, site, and capture date with each clinical photo', async () => {
    const record = { id: 2, paciente_id: 3, consentimientos_fotograficos: [{ id: 1, revocado_en: null }] } as any;
    (page as any).readDataUrl = vi.fn().mockResolvedValue('data:image/jpeg;base64,abc');
    page.photoForm.patchValue({ vista: 'Detalle', zona: 'Mejilla derecha', fecha_captura: '2026-10-23' });
    const input = { files: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })], value: 'photo.jpg' } as any;

    await page.uploadTaggedPhotos(record, { target: input } as any);

    const request = http.expectOne('/api/records/2/photos');
    expect(request.request.body.images[0]).toMatchObject({ vista: 'Detalle', zona: 'Mejilla derecha', fecha_captura: '2026-10-23' });
    request.flush([]);
  });
});
