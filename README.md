# Healthy Skin Clinic

Web para Healthy Skin Clinic con una landing pública optimizada para buscadores, una aplicación interna Angular y una API NestJS.

## Requisitos

- Node.js 20 o superior y npm.

## Desarrollo

```bash
npm install
npm run start:api
```

En otra terminal:

```bash
npm run start:web
```

La landing queda en `http://localhost:3000/`. El servidor Angular queda en `http://localhost:4200/`; `/login` abre el acceso al sistema interno. Las solicitudes `/api` desde Angular se redirigen al backend NestJS.

## Acceso inicial

Para desarrollo, las cuentas iniciales son `usuario` / `contrasena` (doctora) y `secretaria` / `contrasena-secretaria` (secretaría). Copia `.env.example` a `.env`. Antes de publicar, configura credenciales únicas para ambos perfiles, `PUBLIC_URL`, `WEB_ORIGIN` y un valor aleatorio para `JWT_SECRET` (mínimo 32 caracteres). El servidor rechaza esas credenciales de demostración en producción. La doctora administra todas las áreas; secretaría gestiona pacientes y agenda. El acceso a historias clínicas está limitado a la doctora tanto en Angular como en la API.

## Datos

NestJS usa SQLite en `agendamiento_clinico.db` y reutiliza los nombres de tablas existentes (`pacientes`, `citas`, `historia_clinica`) para conservar datos del programa anterior. La base se crea automáticamente al iniciar la API. `DB_PATH` permite cambiar su ubicación.

## Producción

```bash
npm run build
npm start -w @clinic/api
```

Nest sirve los archivos compilados de Angular, mantiene la landing pública en `/` y entrega la aplicación interna en `/login` y `/workspace/...`. Los metadatos SEO de la landing se generan en el servidor NestJS.

## Áreas internas

- Resumen de pacientes, agenda e historias clínicas.
- Registro de pacientes.
- Agenda de citas y estados.
- Registro básico de historias clínicas.

La aplicación anterior de escritorio fue reemplazada. La interfaz del sistema interno está en Angular y NestJS se encarga de la landing pública y la API.
