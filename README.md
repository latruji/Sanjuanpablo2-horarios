# Instituto San Juan Pablo II — Aviso de horarios a portería

App web (Next.js) para que administración cargue cambios de horario
(entradas tardías, salidas anticipadas y salidas educativas) que:

1. Se crean automáticamente como evento en Google Calendar, invitando a
   los porteros (les queda reflejado en su propio calendario).
2. Envían una notificación push al celular/PC de los porteros.

Login restringido por lista de correos Gmail (sin necesidad de Google
Workspace).

---

## 1. Editar las listas de correos autorizados

Archivo: `lib/authorizedUsers.js`

```js
export const ADMIN_EMAILS = ["admin1@gmail.com", "admin2@gmail.com"];
export const PORTERO_EMAILS = ["portero1@gmail.com", "portero2@gmail.com"];
```

Reemplazá por los correos reales. Podés agregar o sacar personas
editando este archivo y volviendo a desplegar (2 minutos en Vercel).

---

## 2. Google Cloud Console (OAuth + Calendar API)

Usá el proyecto que ya tenés en Google Cloud Console, o creá uno nuevo.

1. **Habilitar la API**: Menú → "APIs y servicios" → "Biblioteca" →
   buscar **Google Calendar API** → Habilitar.
2. **Pantalla de consentimiento OAuth**:
   - Tipo de usuario: **Externo**.
   - Estado: dejarla en **"Prueba" (Testing)** — alcanza porque es un
     grupo cerrado de gente.
   - En "Usuarios de prueba" agregá **todos** los Gmail de
     administración y de porteros (los mismos de `authorizedUsers.js`).
     Mientras la app esté en modo prueba, solo esas cuentas van a poder
     loguearse igualmente.
3. **Credenciales** → "Crear credenciales" → **ID de cliente de OAuth**:
   - Tipo: Aplicación web.
   - Orígenes autorizados de JavaScript: `https://sanjuanpablo2-horarios.vercel.app`
   - URI de redireccionamiento autorizado:
     `https://sanjuanpablo2-horarios.vercel.app/api/auth/callback/google`
   - Copiá el **Client ID** y **Client Secret** → van en las variables
     de entorno `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

> Nota: cada evento se crea en el calendario del administrador que lo
> carga, invitando a los porteros como asistentes. Por eso el permiso
> pedido es `calendar.events` (crear/editar eventos), no acceso total
> al Calendar.

---

## 3. Vercel Postgres

1. En tu proyecto de Vercel → pestaña **Storage** → **Create Database**
   → elegí **Postgres** → seguí el asistente (nombre, región).
2. Cuando termine, tocá **Connect Project** y elegí el proyecto
   `sanjuanpablo2-horarios`. Esto agrega automáticamente la variable
   `POSTGRES_URL` (y las relacionadas) al proyecto — no hay que
   cargarla a mano.
3. Andá a la pestaña **Data** (o "Query") de esa base y pegá y ejecutá
   el contenido de `schema.sql` (crea las tablas `eventos` y
   `push_subscriptions`).

---

## 4. Claves VAPID (para el push)

Con Node instalado, corré una sola vez:

```bash
npx web-push generate-vapid-keys
```

Te da un par de claves:
- `Public Key` → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `Private Key` → `VAPID_PRIVATE_KEY`

---

## 5. Variables de entorno en Vercel

En tu proyecto de Vercel (`sanjuanpablo2-horarios`) → Settings →
Environment Variables, cargá todas las de `.env.example`:

```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
NEXTAUTH_URL          -> https://sanjuanpablo2-horarios.vercel.app
NEXTAUTH_SECRET       -> generar con: openssl rand -base64 32
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
```

(`POSTGRES_URL` no hace falta cargarla a mano: la agrega Vercel solo
al conectar la base de datos en el paso anterior.)

---

## 6. Deploy

```bash
npm install
vercel --prod
```

O simplemente conectá el repo de GitHub a Vercel y cada push a `main`
lo despliega solo.

---

## 7. Uso

- **Administración** entra, inicia sesión con Google, completa el
  formulario (tipo de aviso, nivel, curso, fecha/hora, destino si es
  salida educativa, observaciones) y toca "Cargar aviso". Esto:
  - Crea el evento en Google Calendar invitando a todos los porteros.
  - Guarda un registro en Supabase (tabla `eventos`).
  - Envía notificación push a los porteros suscriptos.

- **Porteros** entran una vez, inician sesión con Google y tocan
  "Activar notificaciones" (esto pide permiso del navegador). A partir
  de ahí reciben:
  - El evento en su Google Calendar (como invitación).
  - Una notificación push en el dispositivo donde lo activaron.

  Para recibir push en el celular, conviene que agreguen la web a la
  pantalla de inicio (Chrome → menú → "Agregar a pantalla de inicio"),
  así queda como una app instalada.

---

## Notas / decisiones tomadas

- **No se ven eventos pasados**: la app no lista historial en pantalla
  (queda solo en Supabase para referencia interna y en el Calendar de
  cada uno).
- **Restricción de nivel**: "Entrada tardía" y "Salida anticipada" se
  dejaron fijas en Secundario según lo pedido; "Salida educativa"
  permite elegir cualquiera de los 3 niveles. Si esto cambia, se ajusta
  fácilmente en `app/FormularioEvento.jsx`.
- **Alternativa de calendario compartido**: en vez de invitar a cada
  portero por evento, se podría usar un único calendario compartido
  (todos ven lo mismo sin depender de aceptar invitaciones). Si lo
  preferís, es un cambio chico en `lib/googleCalendar.js` — avisame y
  lo adapto.
