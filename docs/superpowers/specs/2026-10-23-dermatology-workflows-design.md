# Diseño: flujos clínicos y dermatológicos

## Intención

Mejorar la agenda y la continuidad de atención de Healthy Skin Clinic para reducir pasos administrativos y facilitar la documentación dermatológica, sin hacer que el sistema tome decisiones clínicas. El personal debe poder reservar y vincular una cita con su evolución sin perder el contexto; la doctora debe encontrar controles vencidos y comparar fotos clínicas con permiso vigente.

## Alcance aprobado por la solicitud

- Alta rápida de paciente desde la reserva; el paciente nuevo queda seleccionado en la cita. El tipo de cita «Otro» solicita y guarda su descripción.
- Enlazar una cita existente a una evolución desde el formulario de historia. La creación de evolución y el cambio de estado de cita se persisten como una operación coherente.
- Bandeja de seguimiento filtrable por vencidos, próximos y completados; fecha y estado pertenecen a la evolución y no envían mensajes fuera de la aplicación.
- Registrar tratamientos dermatológicos con datos estructurados escritos por la doctora; registrar procedimientos y solicitudes/resultado de biopsia con estados y fechas. No se proponen diagnósticos ni dosis.
- Etiquetar fotos clínicas como panorámica, comparación o detalle, anotar la zona y permitir comparar imágenes de distintas fechas. Se conservan las fotos previas como legado sin inferir su tipo.
- Registrar consentimiento informado de procedimiento con descripción de lo conversado y copia firmada; confirmar consentimiento antes de realizar el procedimiento. Se registra fecha, canal y persona a quien se comunicó un resultado.
- Exigir autorización firmada específica de publicación para casos públicos, independiente de la autorización de fotos clínicas. Revocar o faltar el respaldo despublica el caso.
- Corregir desbordamientos en pantallas pequeñas y revisar los flujos móviles de inicio público y del espacio interno.

## Usuarios y flujo

Secretaría registra datos mínimos de un paciente nuevo dentro de la reserva, elige tipo/fecha/hora/sucursal y confirma; puede identificar el tipo «Otro» sin ambigüedad. La doctora abre una evolución desde una cita o la vincula desde Historias clínicas; al guardar la evolución vinculada, se actualiza la cita sin dejar un registro clínico parcial. La doctora revisa Seguimientos para priorizar controles atrasados o próximos, marca la atención completada y abre el historial correspondiente. Desde una evolución puede registrar tratamiento, procedimiento o biopsia, sus resultados y comunicación. Las fotos clínicas requieren consentimiento clínico vigente; los documentos de consentimiento y las fotos usan rutas autenticadas. Los casos visibles públicamente necesitan un documento firmado dedicado a publicación y pueden ocultarse al revocarlo.

En móvil, los controles se apilan con áreas táctiles adecuadas, las tablas conservan desplazamiento localizado y ninguna página crea desbordamiento horizontal del documento. La navegación sigue llegando a todas las secciones.

## Datos y contratos

- `Appointment.tipo_consulta_otro`: texto opcional; obligatorio cuando `tipo_consulta` es `Otro`.
- `ClinicalRecord.seguimiento_estado`: `Pendiente`, `Realizado` o `Cancelado`; un registro anterior con fecha de seguimiento aparece como pendiente hasta que se resuelva.
- Entidades hijas de historia clínica: tratamiento estructurado, procedimiento/biopsia, fotografía con vista y localización, y consentimiento de procedimiento con metadatos de conversación y archivo firmado.
- Un procedimiento usa `Planificado`, `Realizado` o `Cancelado`. La biopsia tiene su propio estado: `No solicitada`, `Solicitada`, `Resultado disponible` o `Comunicada`. Se permite más de un procedimiento por historia; la biopsia se vincula al procedimiento relacionado.
- Para marcar un resultado como comunicado se registra fecha, destinatario (paciente o representante) y canal (presencial, llamada, portal u otro). La app no comunica resultados por sí misma.
- El consentimiento fotográfico clínico se considera vigente desde que existe una copia firmada y hasta que se registra su revocación; no hay expiración automática. La revocación impide subir fotos nuevas. Las fotos ya incorporadas se conservan como documentación clínica restringida conforme a la política de retención que defina la clínica.
- El endpoint autenticado de evolución vinculada valida que cita y paciente coincidan y evita una segunda evolución para una cita ya vinculada; crea evolución y marca la cita atendida dentro de una transacción SQLite.
- El consentimiento de publicación es una entidad/registro separado y de acceso autenticado. La consulta pública filtra casos con autorización revocada o sin documento firmado.
- Altas de campos y tablas son aditivas. Los datos existentes y sus imágenes permanecen legibles; fotos clínicas antiguas se presentan como «Sin clasificar».
- Las rutas de consentimiento, fotografías clínicas y datos de historia se restringen al perfil doctora. La página pública no recibe esos documentos ni metadatos identificables.

## Límites y seguridad

- Este cambio mejora el registro y control de acceso de la aplicación; no acredita cumplimiento legal ecuatoriano. La clínica debe validar finalidades, base de legitimación, textos/formularios, acceso, retención, copias de seguridad y respuesta a incidentes con sus responsables clínicos y de privacidad.
- No se redactan ni aceptan automáticamente formularios legales como sustituto de los documentos aprobados por la clínica. Se carga la copia firmada que la clínica ya utiliza.
- No se envían recordatorios por SMS, correo ni WhatsApp; la bandeja es interna.
- No se incluyen facturación, recetas farmacológicas, recomendación clínica, teleconsulta con pacientes ni automatización diagnóstica.
- La autorización de publicación no implica consentimiento clínico; la autorización clínica no permite publicación. Revocar publicación no revoca automáticamente la autorización clínica, y viceversa.

## Fundamento consultado

- AAD: conservar antecedentes y registro de consulta, usar canal seguro para fotos clínicas, y capturar orientación, comparación y detalle con fotos enfocadas e iluminadas: https://www.aad.org/public/fad/digital-health/telemedicine/quality-care y https://www.aad.org/public/fad/digital-health/taking-pictures-skin
- BAD: el consentimiento sigue una explicación clínica y debe adecuarse a preferencias y comprensión de la persona: https://www.bad.org.uk/clinical-services/service-guidance/consent
- Ecuador: el portal del MSP describe consentimiento previo, libre, pleno e informado, incluida la explicación comprensible de naturaleza, riesgos, alternativas y consecuencias: https://www.salud.gob.ec/derecho-a-la-salud-en-su-componente-de-obtener-un-consentimiento-informado-valido/
- SPDP: marco vigente de datos personales y sensibles de salud, gestión de riesgos, seguridad y minimización: https://www.spdp.gob.ec/marco-normativo/

## Decisiones de implementación

Seguir Angular, NestJS y SQLite actuales. Preferir tablas hijas para datos dermatológicos repetibles, validación en API y formularios pequeños por flujo. Mantener el estilo visual y la navegación existente; no reescribir la aplicación completa. En registros antiguos no inferir estado de biopsia, clasificación fotográfica ni firma de publicación que no exista en los datos. La revisión del diseño confirmó que hace falta definir ciclos de estado, vigencia de fotos y trazabilidad de comunicación; se fijaron los ciclos y campos anteriores para que los flujos sean planificables sin añadir envíos externos ni borrado automático de historia clínica.
