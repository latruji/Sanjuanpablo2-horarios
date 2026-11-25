# Portería y Horarios — Instituto San Juan Pablo II

Aplicación web para informar a Portería sobre cambios de horarios y salidas educativas, con inicio de sesión mediante Google y sincronización automática con Google Calendar.

## Funcionalidades principales

- **Autenticación con Google (`next-auth`):** Todos los usuarios ingresan con su cuenta `@gmail.com`.
- **Control de roles:**
  - **Administradores:** Cargan, editan y eliminan avisos, y administran los correos autorizados desde el panel **Usuarios**.
  - **Porteros (Solo lectura):** Visualizan los avisos organizados por fecha (**Hoy**, **Próximos días**, **Pasados**) con filtros por nivel, turno y tipo.
- **Tipos de avisos:**
  - **Entrada Tarde** *(Secundario - Turno Mañana, por curso completo)*
  - **Salida Anticipada** *(Secundario - Turno Mañana, por curso completo)*
  - **Salida Educativa** *(Inicial, Primario y Secundario, con fecha/hora de salida y regreso estimado, destino, docentes y transporte)*
- **Sincronización automática con Google Calendar:** Al crear, editar o eliminar un aviso, se actualiza automáticamente el evento en el calendario institucional.

---

## Estructura académica configurada

- **Nivel Inicial:** Turno Mañana (`Sala de 3`, `Sala de 4`, `Sala de 5`) · Turno Tarde (`Sala de 4`, `Sala de 5`)
- **Nivel Primario:** Turno Mañana y Turno Tarde (`1° Grado` a `6° Grado`, división única)
- **Nivel Secundario:** Turno Mañana (`1° Año` a `6° Año`, división única)

---

## Variables de entorno requeridas en Vercel

Configurar en **Vercel → Project Settings → Environment Variables**:

### 1. Base de datos PostgreSQL
Conectar una base **Neon / Postgres** desde la pestaña **Storage** de Vercel (crea automáticamente `POSTGRES_URL` y sus variables asociadas). Las tablas `users` y `notices` se crean automáticamente en el primer uso.

### 2. Login con Google (OAuth 2.0)
Crear un ID de cliente OAuth (Aplicación web) en Google Cloud Console con la URI de redirección:
`https://sanjuanpablo2-horarios.vercel.app/api/auth/callback/google`

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_URL=https://sanjuanpablo2-horarios.vercel.app
NEXTAUTH_SECRET=clave-secreta-larga-aleatoria
```

### 3. Google Calendar (Cuenta de Servicio)
Habilitar **Google Calendar API** en Google Cloud Console, crear una Cuenta de Servicio con clave JSON y compartir el Google Calendar del colegio con el correo `client_email` con permiso **"Hacer cambios en eventos"**.

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=...iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=id-del-calendario@group.calendar.google.com
```

*(Opcional)* Si se desean calendarios separados por nivel o mostrar el botón directo al calendario:
```env
GOOGLE_CALENDAR_ID_INICIAL=...
GOOGLE_CALENDAR_ID_PRIMARIO=...
GOOGLE_CALENDAR_ID_SECUNDARIO=...
NEXT_PUBLIC_GOOGLE_CALENDAR_URL=https://calendar.google.com/calendar/embed?src=...
```

### 4. Administradores iniciales
Lista de correos Gmail separados por coma con acceso de Administrador garantizado:

```env
INITIAL_ADMIN_EMAILS=correo1@gmail.com,correo2@gmail.com
```

---

## Ejecución local

```bash
npm install
npm run dev
```
