import Database from 'better-sqlite3';
import { resolve } from 'node:path';

if (process.env.NODE_ENV === 'production') throw new Error('El seed de demostración está deshabilitado en producción.');
const dbPath = resolve(process.cwd(), 'agendamiento_clinico.db');
if (!dbPath.endsWith('/clinic-appointment-scheduler/agendamiento_clinico.db')) throw new Error(`Ruta inesperada para seed local: ${dbPath}`);
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date());
const dateOffset = (days) => {
  const [year, month, day] = today.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(date);
};
const patients = [
  ['DEMO-0001','Valentina','Mera','valentina.mera@example.test','0990001001',29,'Femenino','Soltera','Diseñadora','La Concordia','Santo Domingo'],
  ['DEMO-0002','Mateo','Cedeño','mateo.cedeno@example.test','0990001002',34,'Masculino','Casado','Docente','La Concordia','Quito'],
  ['DEMO-0003','Camila','Zambrano','camila.zambrano@example.test','0990001003',23,'Femenino','Soltera','Estudiante','La Concordia','Esmeraldas'],
  ['DEMO-0004','Daniela','Vera','daniela.vera@example.test','0990001004',41,'Femenino','Casada','Emprendedora','La Concordia','Portoviejo'],
  ['DEMO-0005','Nicolás','Pazmiño','nicolas.pazmino@example.test','0990001005',27,'Masculino','Soltero','Ingeniero','La Concordia','Guayaquil'],
  ['DEMO-0006','Lucía','Arroyo','lucia.arroyo@example.test','0990001006',36,'Femenino','Unión de hecho','Administradora','La Concordia','Santo Domingo'],
  ['DEMO-0007','Andrés','Loor','andres.loor@example.test','0990001007',32,'Masculino','Soltero','Comerciante','La Concordia','Quevedo'],
  ['DEMO-0008','Emilia','Solís','emilia.solis@example.test','0990001008',19,'Femenino','Soltera','Estudiante','La Concordia','La Concordia'],
];
const insertPatient = db.prepare(`INSERT INTO patients (cedula,nombre,apellido,email,telefono,edad,sexo,estado_civil,ocupacion,residencia_actual,residencia_anterior,tipo_identificacion,fecha_nacimiento,nacionalidad,direccion_actual,contacto_emergencia,relacion_emergencia,telefono_emergencia,idioma_preferido,canal_contacto,profesional_referente)
VALUES (@cedula,@nombre,@apellido,@email,@telefono,@edad,@sexo,@estado_civil,@ocupacion,@residencia_actual,@residencia_anterior,@tipo_identificacion,@fecha_nacimiento,@nacionalidad,@direccion_actual,@contacto_emergencia,@relacion_emergencia,@telefono_emergencia,@idioma_preferido,@canal_contacto,@profesional_referente)`);
const findBranch = db.prepare('SELECT id FROM sucursales WHERE nombre=?');
const insertBranch = db.prepare('INSERT INTO sucursales (nombre,direccion,telefono,activa) VALUES (@nombre,@direccion,@telefono,1)');
const updateBranch = db.prepare('UPDATE sucursales SET direccion=@direccion,telefono=@telefono,activa=1 WHERE nombre=@nombre');
const transaction = db.transaction(() => {
  // Rebuild only rows tagged as demo fixtures, leaving every other local record intact.
  const demoIds = db.prepare("SELECT id FROM patients WHERE cedula LIKE 'DEMO-%'").all().map(row => row.id);
  for (const id of demoIds) {
    db.prepare('DELETE FROM historia_clinica WHERE paciente_id=?').run(id);
    db.prepare('DELETE FROM citas WHERE paciente_id=?').run(id);
    db.prepare('DELETE FROM patients WHERE id=?').run(id);
  }
  db.prepare("DELETE FROM public_cases WHERE title LIKE '[DEMO] %'").run();
  db.prepare("DELETE FROM store_products WHERE name LIKE '[DEMO] %'").run();

  const branches = [
    { nombre: 'Consultorio demo · La Concordia', direccion: 'Av. Simón Plata Torres · dirección ficticia', telefono: '0990000000' },
    { nombre: 'Sede demo · Santo Domingo', direccion: 'Centro · dirección ficticia', telefono: '0990000000' },
  ];
  for (const branch of branches) {
    if (findBranch.get(branch.nombre)) updateBranch.run(branch);
    else insertBranch.run(branch);
  }
  const branchIds = branches.map(({ nombre }) => db.prepare('SELECT id FROM sucursales WHERE nombre=?').get(nombre).id);
  for (const [index,p] of patients.entries()) { const birthYear=Number(today.slice(0,4))-p[5]; insertPatient.run({ cedula:p[0], nombre:p[1], apellido:p[2], email:p[3], telefono:p[4], edad:p[5], sexo:p[6], estado_civil:p[7], ocupacion:p[8], residencia_actual:p[9], residencia_anterior:p[10], tipo_identificacion:'Cédula', fecha_nacimiento:`${birthYear}-06-15`, nacionalidad:'Ecuatoriana', direccion_actual:`Dirección ficticia ${index+1}, ${p[9]}`, contacto_emergencia:`Contacto demo ${index+1}`, relacion_emergencia:index%2?'Familiar':'Amistad', telefono_emergencia:`09900020${String(index+1).padStart(2,'0')}`, idioma_preferido:'Español', canal_contacto:index%2?'WhatsApp':'Teléfono', profesional_referente:'Referencia ficticia de demostración' }); }
  const patientIds = patients.map(([cedula]) => db.prepare('SELECT id FROM patients WHERE cedula=?').get(cedula).id);

  const appointments = [
    [0,-18,'09:00','Atendida','Consulta de valoración de demostración · datos ficticios.'],
    [1,-15,'10:30','Atendida','Seguimiento de demostración · no corresponde a una persona real.'],
    [2,-10,'11:00','Atendida','Cita de ejemplo para revisar el historial.'],
    [3,-7,'14:00','Atendida','Registro ficticio de demostración.'],
    [4,-3,'09:30','Cancelada','Cita cancelada de ejemplo.'],
    [5,0,'09:00','Programada','Cita de demostración · datos ficticios.'],
    [6,0,'10:30','Programada','Cita de demostración · datos ficticios.'],
    [7,1,'11:00','Programada','Primera valoración de demostración.'],
    [0,2,'14:00','Programada','Seguimiento ficticio de cuidado facial.'],
    [1,3,'15:00','Programada','Consulta de ejemplo para revisar la agenda.'],
    [2,5,'09:30','Programada','Cita de demostración · datos ficticios.'],
    [3,8,'10:00','Programada','Seguimiento de ejemplo · datos ficticios.'],
    [4,12,'11:30','Programada','Cita futura de demostración.'],
    [5,16,'14:30','Programada','Cita futura de demostración.'],
  ];
  const insertAppointment = db.prepare(`INSERT INTO citas (paciente_id,fecha,hora,descripcion,ubicacion,estado,imagenes,sucursal_id)
    VALUES (?,?,?,?,?,?,?,?)`);
  const appointmentIds = [];
  for (const [person,offset,time,status,description] of appointments) {
    const result = insertAppointment.run(patientIds[person],dateOffset(offset),time,description,offset%2?'Dermatología':'Consulta',status,'[]',branchIds[person%2]);
    appointmentIds.push(result.lastInsertRowid);
  }
  const insertRecord = db.prepare(`INSERT INTO historia_clinica (paciente_id,cita_id,fecha,motivo_consulta,antecedentes_enfermedades,medicamentos_habituales,habitos_nocivos,metodos_anticonceptivos,examen_fisico,diagnostico_definitivo,imagenes,alergias,antecedentes_dermatologicos,antecedentes_familiares_dermatologicos,tratamientos_dermatologicos_previos,rutina_cuidado_piel,tipo_piel,fototipo,exposicion_solar,cicatrizacion_queloides,embarazo_lactancia,localizacion_lesion,tiempo_evolucion)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const notes = [
    ['Valoración inicial ficticia','Sin antecedentes registrados en este ejemplo.','Sin medicación registrada en este ejemplo.','Dato de prueba.','No aplica · dato de demostración.','Ejemplo de nota clínica para mostrar la interfaz.','No es una indicación médica.'],
    ['Seguimiento de rutina de ejemplo','Antecedentes ficticios para demostración.','No registra medicación en este ejemplo.','Dato de prueba.','No aplica · dato de demostración.','Nota ficticia. La ficha no pertenece a una persona real.','Solo para revisar la vista.'],
    ['Consulta dermatológica de demostración','Dato ficticio de prueba.','Dato ficticio de prueba.','Dato de prueba.','No aplica · dato de demostración.','Registro de muestra para visualizar el historial clínico.','No usar para decisiones de salud.'],
    ['Revisión de cuidado facial ficticia','Sin antecedentes en el dato de ejemplo.','Sin medicación en el dato de ejemplo.','Dato de prueba.','No aplica · dato de demostración.','Contenido ilustrativo.','No es una indicación médica.'],
    ['Consulta de valoración ficticia','Dato de prueba, no clínico.','Dato de prueba, no clínico.','Dato de prueba.','No aplica · dato de demostración.','Nota de ejemplo para revisar la vista de historias clínicas.','Sin validez clínica.'],
  ];
  for (let i=0;i<5;i++) {
    const apptIndex = i;
    insertRecord.run(patientIds[i],appointmentIds[apptIndex],dateOffset(appointments[apptIndex][1]),...notes[i],'[]','Dato ficticio de demostración; alergias no verificadas.','Antecedentes de ejemplo, sin validez clínica.','No disponible en este dato ilustrativo.','Sin procedimientos previos registrados en esta muestra.','Rutina ilustrativa, no recomendación de uso.',['Mixta','Grasa','Sensible','Seca','Normal'][i],'','Exposición solar de ejemplo; protección no documentada.','','','Zona de ejemplo','Dato ilustrativo, no clínico.');
  }

  const insertCase = db.prepare(`INSERT INTO public_cases (title,description,images,consent,published) VALUES (?,?,?,0,0)`);
  insertCase.run('[DEMO] Ejemplo de ficha de caso (borrador)','Contenido ficticio para revisar el panel. Sin consentimiento y sin publicación; no representa a un paciente ni un resultado real.','[]');
  const insertProduct = db.prepare(`INSERT INTO store_products (name,description,price,image_url,active) VALUES (?,?,?,?,1)`);
  const products = [
    ['[DEMO] Limpiador facial suave','Producto ficticio de ejemplo para revisar el catálogo.','USD 18','/brand/skincare-editorial.png'],
    ['[DEMO] Hidratante de uso diario','Contenido ilustrativo. Consulta al equipo antes de elegir productos para tu piel.','USD 24','/brand/skincare-editorial.png'],
    ['[DEMO] Protector solar SPF 50','Producto ficticio para mostrar tarjetas, descripciones y precios.','USD 21','/brand/skincare-editorial.png'],
    ['[DEMO] Sérum hidratante','Producto de muestra, no disponible para compra.','USD 27','/brand/skincare-editorial.png'],
  ];
  for (const product of products) insertProduct.run(...product);
  return { patients: patientIds.length, appointments: appointments.length, records: 5, branches: branches.length, cases: 1, products: products.length };
});
try {
  const result = transaction();
  console.log(`Seed local de demostración listo (${dbPath})`);
  console.log(JSON.stringify(result));
  console.log('Identificadores demo: DEMO-0001 a DEMO-0008; todos son datos ficticios.');
} finally { db.close(); }
