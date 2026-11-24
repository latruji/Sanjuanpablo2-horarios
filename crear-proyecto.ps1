$utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Write-ProjectFile($relPath, $content) {
  $fullPath = Join-Path (Get-Location) $relPath
  $dir = Split-Path $fullPath -Parent
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  [System.IO.File]::WriteAllText($fullPath, $content.TrimStart("`r", "`n"), $utf8NoBom)
  Write-Host "Creado: $relPath" -ForegroundColor Green
}

New-Item -ItemType Directory -Path (Join-Path (Get-Location) "public") -Force | Out-Null

Write-ProjectFile "package.json" @'
{
  "name": "sanjuanpablo2-horarios",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.5",
    "next-auth": "4.24.7",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "googleapis": "144.0.0",
    "@vercel/postgres": "0.10.0"
  }
}
'@

Write-ProjectFile "jsconfig.json" @'
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
'@

Write-ProjectFile "next.config.mjs" @'
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
'@

Write-ProjectFile ".gitignore" @'
node_modules
.next
.env
.env.local
.vercel
'@

Write-ProjectFile "lib/constants.js" @'
export const LEVELS = {
  Inicial: {
    label: 'Nivel Inicial',
    turns: {
      Mañana: ['Sala de 3', 'Sala de 4', 'Sala de 5'],
      Tarde: ['Sala de 4', 'Sala de 5'],
    },
  },
  Primario: {
    label: 'Nivel Primario',
    turns: {
      Mañana: ['1° Grado', '2° Grado', '3° Grado', '4° Grado', '5° Grado', '6° Grado'],
      Tarde: ['1° Grado', '2° Grado', '3° Grado', '4° Grado', '5° Grado', '6° Grado'],
    },
  },
  Secundario: {
    label: 'Nivel Secundario',
    turns: {
      Mañana: ['1° Año', '2° Año', '3° Año', '4° Año', '5° Año', '6° Año'],
    },
  },
};

export const NOTICE_TYPES = {
  entrada_tarde: {
    label: 'Entrada Tarde',
    shortLabel: 'Entrada Tarde',
    allowedLevels: ['Secundario'],
    badgeClass: 'badge-warning',
    calendarColorId: '5',
  },
  salida_anticipada: {
    label: 'Salida Anticipada',
    shortLabel: 'Salida Anticipada',
    allowedLevels: ['Secundario'],
    badgeClass: 'badge-danger',
    calendarColorId: '11',
  },
  salida_educativa: {
    label: 'Salida Educativa',
    shortLabel: 'Salida Educativa',
    allowedLevels: ['Inicial', 'Primario', 'Secundario'],
    badgeClass: 'badge-primary',
    calendarColorId: '9',
  },
};

export function getTodayArgentina() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function formatDateAR(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}
'@

Write-ProjectFile "lib/db.js" @'
import { sql } from '@vercel/postgres';

let tablesReadyPromise = null;

export async function ensureTables() {
  if (!tablesReadyPromise) {
    tablesReadyPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) DEFAULT '',
          role VARCHAR(30) NOT NULL CHECK (role IN ('admin', 'portero')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS notices (
          id SERIAL PRIMARY KEY,
          type VARCHAR(40) NOT NULL,
          level VARCHAR(30) NOT NULL,
          turn VARCHAR(20) NOT NULL,
          courses TEXT NOT NULL,
          event_date VARCHAR(10) NOT NULL,
          start_time VARCHAR(5) NOT NULL,
          return_date VARCHAR(10),
          return_time VARCHAR(5),
          destination VARCHAR(255) DEFAULT '',
          teachers VARCHAR(255) DEFAULT '',
          transport VARCHAR(255) DEFAULT '',
          notes TEXT DEFAULT '',
          google_event_id VARCHAR(255),
          calendar_id VARCHAR(255),
          calendar_error TEXT DEFAULT '',
          created_by VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
    })().catch((err) => {
      tablesReadyPromise = null;
      throw err;
    });
  }
  return tablesReadyPromise;
}

export function getInitialAdminEmails() {
  const raw = process.env.INITIAL_ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function getUserRole(email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();

  if (getInitialAdminEmails().includes(normalized)) {
    return 'admin';
  }

  await ensureTables();
  const { rows } = await sql`
    SELECT role FROM users WHERE LOWER(email) = ${normalized} LIMIT 1;
  `;
  return rows[0]?.role || null;
}

export async function listUsers() {
  await ensureTables();
  const { rows } = await sql`
    SELECT id, email, name, role, created_at
    FROM users
    ORDER BY role ASC, email ASC;
  `;
  return rows;
}

export async function upsertUser({ email, name = '', role }) {
  await ensureTables();
  const normalized = email.trim().toLowerCase();
  const { rows } = await sql`
    INSERT INTO users (email, name, role)
    VALUES (${normalized}, ${name.trim()}, ${role})
    ON CONFLICT (email)
    DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
    RETURNING id, email, name, role, created_at;
  `;
  return rows[0];
}

export async function deleteUserById(id) {
  await ensureTables();
  await sql`DELETE FROM users WHERE id = ${id};`;
}

function parseNoticeRow(row) {
  let courses = [];
  try {
    courses = JSON.parse(row.courses);
  } catch {
    courses = row.courses ? [row.courses] : [];
  }
  return { ...row, courses };
}

export async function listNotices() {
  await ensureTables();
  const { rows } = await sql`
    SELECT * FROM notices
    ORDER BY event_date ASC, start_time ASC, id DESC;
  `;
  return rows.map(parseNoticeRow);
}

export async function getNoticeById(id) {
  await ensureTables();
  const { rows } = await sql`SELECT * FROM notices WHERE id = ${id} LIMIT 1;`;
  return rows[0] ? parseNoticeRow(rows[0]) : null;
}

export async function createNotice(data) {
  await ensureTables();
  const coursesJson = JSON.stringify(data.courses || []);
  const { rows } = await sql`
    INSERT INTO notices (
      type, level, turn, courses, event_date, start_time,
      return_date, return_time, destination, teachers, transport, notes,
      google_event_id, calendar_id, calendar_error, created_by
    ) VALUES (
      ${data.type}, ${data.level}, ${data.turn}, ${coursesJson},
      ${data.event_date}, ${data.start_time}, ${data.return_date || null},
      ${data.return_time || null}, ${data.destination || ''},
      ${data.teachers || ''}, ${data.transport || ''}, ${data.notes || ''},
      ${data.google_event_id || null}, ${data.calendar_id || null},
      ${data.calendar_error || ''}, ${data.created_by}
    )
    RETURNING *;
  `;
  return parseNoticeRow(rows[0]);
}

export async function updateNotice(id, data) {
  await ensureTables();
  const coursesJson = JSON.stringify(data.courses || []);
  const { rows } = await sql`
    UPDATE notices SET
      type = ${data.type},
      level = ${data.level},
      turn = ${data.turn},
      courses = ${coursesJson},
      event_date = ${data.event_date},
      start_time = ${data.start_time},
      return_date = ${data.return_date || null},
      return_time = ${data.return_time || null},
      destination = ${data.destination || ''},
      teachers = ${data.teachers || ''},
      transport = ${data.transport || ''},
      notes = ${data.notes || ''},
      google_event_id = ${data.google_event_id ?? null},
      calendar_id = ${data.calendar_id ?? null},
      calendar_error = ${data.calendar_error || ''},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
    RETURNING *;
  `;
  return rows[0] ? parseNoticeRow(rows[0]) : null;
}

export async function deleteNoticeById(id) {
  await ensureTables();
  await sql`DELETE FROM notices WHERE id = ${id};`;
}
'@

Write-ProjectFile "lib/googleCalendar.js" @'
import { google } from 'googleapis';
import { NOTICE_TYPES } from './constants';

const TIMEZONE = 'America/Argentina/Buenos_Aires';

function getCalendarClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    return null;
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  return google.calendar({ version: 'v3', auth });
}

export function resolveCalendarId(level) {
  const byLevel = {
    Inicial: process.env.GOOGLE_CALENDAR_ID_INICIAL,
    Primario: process.env.GOOGLE_CALENDAR_ID_PRIMARIO,
    Secundario: process.env.GOOGLE_CALENDAR_ID_SECUNDARIO,
  };
  return byLevel[level] || process.env.GOOGLE_CALENDAR_ID || '';
}

function addMinutesToTime(dateStr, timeStr, minutesToAdd = 30) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, hh, mm + minutesToAdd, 0));
  const pad = (n) => String(n).padStart(2, '0');
  const endDate = `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  const endTime = `${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`;
  return { endDate, endTime };
}

function buildGoogleEventPayload(notice) {
  const typeMeta = NOTICE_TYPES[notice.type];
  const coursesText = (notice.courses || []).join(', ');
  const levelTag = `[${notice.level} ${notice.turn === 'Mañana' ? 'TM' : 'TT'}]`;

  let summary = '';
  const startDateTime = `${notice.event_date}T${notice.start_time}:00-03:00`;
  let endDateTime = '';

  if (notice.type === 'entrada_tarde') {
    summary = `⏰ ENTRADA TARDE ${levelTag} ${coursesText} (Ingresa ${notice.start_time})`;
    const { endDate, endTime } = addMinutesToTime(notice.event_date, notice.start_time, 30);
    endDateTime = `${endDate}T${endTime}:00-03:00`;
  } else if (notice.type === 'salida_anticipada') {
    summary = `🚪 SALIDA ANTICIPADA ${levelTag} ${coursesText} (Se retira ${notice.start_time})`;
    const { endDate, endTime } = addMinutesToTime(notice.event_date, notice.start_time, 30);
    endDateTime = `${endDate}T${endTime}:00-03:00`;
  } else {
    const dest = notice.destination ? ` - ${notice.destination}` : '';
    summary = `🚌 SALIDA EDUCATIVA ${levelTag} ${coursesText}${dest}`;
    if (notice.return_date && notice.return_time) {
      endDateTime = `${notice.return_date}T${notice.return_time}:00-03:00`;
    } else {
      const { endDate, endTime } = addMinutesToTime(notice.event_date, notice.start_time, 120);
      endDateTime = `${endDate}T${endTime}:00-03:00`;
    }
  }

  const lines = [
    'Instituto San Juan Pablo II - Aviso para Portería',
    `Tipo: ${typeMeta?.label || notice.type}`,
    `Nivel: ${notice.level} (Turno ${notice.turn})`,
    `Curso(s): ${coursesText}`,
  ];

  if (notice.type === 'salida_educativa') {
    if (notice.destination) lines.push(`Destino/Actividad: ${notice.destination}`);
    lines.push(`Salida: ${notice.event_date} a las ${notice.start_time} hs`);
    if (notice.return_date && notice.return_time) {
      lines.push(`Regreso estimado: ${notice.return_date} a las ${notice.return_time} hs`);
    }
    if (notice.teachers) lines.push(`Docentes responsables: ${notice.teachers}`);
    if (notice.transport) lines.push(`Transporte: ${notice.transport}`);
  } else {
    lines.push(`Horario informado: ${notice.start_time} hs`);
  }

  if (notice.notes) lines.push(`Observaciones: ${notice.notes}`);
  lines.push(`Cargado por: ${notice.created_by}`);

  return {
    summary,
    location: notice.destination || 'Instituto San Juan Pablo II',
    description: lines.join('\n'),
    colorId: typeMeta?.calendarColorId || '9',
    start: { dateTime: startDateTime, timeZone: TIMEZONE },
    end: { dateTime: endDateTime, timeZone: TIMEZONE },
  };
}

export async function syncCreateCalendarEvent(notice) {
  const calendar = getCalendarClient();
  const calendarId = resolveCalendarId(notice.level);

  if (!calendar || !calendarId) {
    return {
      google_event_id: null,
      calendar_id: calendarId || null,
      calendar_error: 'Faltan variables de Google Calendar.',
    };
  }

  try {
    const res = await calendar.events.insert({
      calendarId,
      requestBody: buildGoogleEventPayload(notice),
    });
    return {
      google_event_id: res.data.id,
      calendar_id: calendarId,
      calendar_error: '',
    };
  } catch (err) {
    console.error('Error creando evento en Google Calendar:', err);
    return {
      google_event_id: null,
      calendar_id: calendarId,
      calendar_error: err?.message || 'Error al sincronizar con Google Calendar',
    };
  }
}

export async function syncUpdateCalendarEvent(existingNotice, updatedNotice) {
  const calendar = getCalendarClient();
  const targetCalendarId = resolveCalendarId(updatedNotice.level);

  if (!calendar || !targetCalendarId) {
    return {
      google_event_id: existingNotice.google_event_id || null,
      calendar_id: targetCalendarId || null,
      calendar_error: 'Faltan credenciales de Google Calendar.',
    };
  }

  if (!existingNotice.google_event_id || (existingNotice.calendar_id && existingNotice.calendar_id !== targetCalendarId)) {
    if (existingNotice.google_event_id && existingNotice.calendar_id) {
      await syncDeleteCalendarEvent(existingNotice.calendar_id, existingNotice.google_event_id);
    }
    return syncCreateCalendarEvent(updatedNotice);
  }

  try {
    await calendar.events.update({
      calendarId: targetCalendarId,
      eventId: existingNotice.google_event_id,
      requestBody: buildGoogleEventPayload(updatedNotice),
    });
    return {
      google_event_id: existingNotice.google_event_id,
      calendar_id: targetCalendarId,
      calendar_error: '',
    };
  } catch (err) {
    console.error('Error actualizando evento en Google Calendar:', err);
    return {
      google_event_id: existingNotice.google_event_id,
      calendar_id: targetCalendarId,
      calendar_error: err?.message || 'Error al actualizar evento en Calendar',
    };
  }
}

export async function syncDeleteCalendarEvent(calendarId, eventId) {
  if (!calendarId || !eventId) return;
  const calendar = getCalendarClient();
  if (!calendar) return;
  try {
    await calendar.events.delete({ calendarId, eventId });
  } catch (err) {
    console.error('Error eliminando evento de Google Calendar:', err);
  }
}
'@

Write-ProjectFile "lib/auth.js" @'
import GoogleProvider from 'next-auth/providers/google';
import { getUserRole } from './db';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      const email = user?.email || token?.email;
      if (email) {
        try {
          token.role = await getUserRole(email);
        } catch (err) {
          console.error('Error consultando rol:', err);
          token.role = null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role || null;
      }
      return session;
    },
  },
};
'@

Write-ProjectFile "app/api/auth/[...nextauth]/route.js" @'
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
'@

Write-ProjectFile "app/api/notices/route.js" @'
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createNotice, getUserRole, listNotices } from '@/lib/db';
import { syncCreateCalendarEvent } from '@/lib/googleCalendar';
import { LEVELS, NOTICE_TYPES } from '@/lib/constants';

function validateNoticePayload(body) {
  const { type, level, turn, courses, event_date, start_time, return_date, return_time } = body;

  if (!NOTICE_TYPES[type]) return 'Tipo de aviso inválido.';
  if (!LEVELS[level]) return 'Nivel inválido.';
  if (!NOTICE_TYPES[type].allowedLevels.includes(level)) {
    return `El tipo "${NOTICE_TYPES[type].label}" solo aplica a Secundario.`;
  }
  const validCourses = LEVELS[level].turns[turn];
  if (!validCourses) return 'Turno inválido para ese nivel.';
  if (!Array.isArray(courses) || courses.length === 0) return 'Debes seleccionar al menos un curso/sala.';
  if (courses.some((c) => !validCourses.includes(c))) return 'Hay cursos inválidos para el nivel/turno elegido.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date || '')) return 'Fecha inválida.';
  if (!/^\d{2}:\d{2}$/.test(start_time || '')) return 'Hora inválida.';

  if (type === 'salida_educativa') {
    if (!body.destination?.trim()) return 'Ingresa el destino o actividad de la salida educativa.';
    if (return_date && !/^\d{4}-\d{2}-\d{2}$/.test(return_date)) return 'Fecha de regreso inválida.';
    if (return_time && !/^\d{2}:\d{2}$/.test(return_time)) return 'Hora de regreso inválida.';
    if (return_date && return_time) {
      const startIso = `${event_date}T${start_time}`;
      const endIso = `${return_date}T${return_time}`;
      if (endIso < startIso) return 'La fecha y hora de regreso no pueden ser anteriores a la salida.';
    }
  }

  return null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const role = await getUserRole(session.user.email);
  if (role !== 'admin' && role !== 'portero') {
    return NextResponse.json({ error: 'Usuario no autorizado' }, { status: 403 });
  }

  const notices = await listNotices();
  return NextResponse.json({ notices, role });
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const role = await getUserRole(session.user.email);
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Solo los administradores pueden cargar avisos' }, { status: 403 });
  }

  const body = await request.json();
  const validationError = validateNoticePayload(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const payload = {
    type: body.type,
    level: body.level,
    turn: body.turn,
    courses: body.courses,
    event_date: body.event_date,
    start_time: body.start_time,
    return_date: body.type === 'salida_educativa' ? (body.return_date || body.event_date) : null,
    return_time: body.type === 'salida_educativa' ? (body.return_time || null) : null,
    destination: body.type === 'salida_educativa' ? (body.destination || '').trim() : '',
    teachers: body.type === 'salida_educativa' ? (body.teachers || '').trim() : '',
    transport: body.type === 'salida_educativa' ? (body.transport || '').trim() : '',
    notes: (body.notes || '').trim(),
    created_by: session.user.email,
  };

  const calSync = await syncCreateCalendarEvent(payload);
  const created = await createNotice({ ...payload, ...calSync });

  return NextResponse.json({ notice: created }, { status: 201 });
}
'@

Write-ProjectFile "app/api/notices/[id]/route.js" @'
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteNoticeById, getNoticeById, getUserRole, updateNotice } from '@/lib/db';
import { syncDeleteCalendarEvent, syncUpdateCalendarEvent } from '@/lib/googleCalendar';
import { LEVELS, NOTICE_TYPES } from '@/lib/constants';

export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const role = await getUserRole(session.user.email);
  if (role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const existing = await getNoticeById(id);
  if (!existing) return NextResponse.json({ error: 'Aviso no encontrado' }, { status: 404 });

  const body = await request.json();
  if (!NOTICE_TYPES[body.type] || !LEVELS[body.level] || !Array.isArray(body.courses) || body.courses.length === 0) {
    return NextResponse.json({ error: 'Datos incompletos o inválidos' }, { status: 400 });
  }

  const nextData = {
    type: body.type,
    level: body.level,
    turn: body.turn,
    courses: body.courses,
    event_date: body.event_date,
    start_time: body.start_time,
    return_date: body.type === 'salida_educativa' ? (body.return_date || body.event_date) : null,
    return_time: body.type === 'salida_educativa' ? (body.return_time || null) : null,
    destination: body.type === 'salida_educativa' ? (body.destination || '').trim() : '',
    teachers: body.type === 'salida_educativa' ? (body.teachers || '').trim() : '',
    transport: body.type === 'salida_educativa' ? (body.transport || '').trim() : '',
    notes: (body.notes || '').trim(),
    created_by: existing.created_by,
  };

  const calSync = await syncUpdateCalendarEvent(existing, nextData);
  const updated = await updateNotice(id, { ...nextData, ...calSync });

  return NextResponse.json({ notice: updated });
}

export async function DELETE(_request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const role = await getUserRole(session.user.email);
  if (role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const existing = await getNoticeById(id);
  if (!existing) return NextResponse.json({ error: 'Aviso no encontrado' }, { status: 404 });

  if (existing.google_event_id && existing.calendar_id) {
    await syncDeleteCalendarEvent(existing.calendar_id, existing.google_event_id);
  }

  await deleteNoticeById(id);
  return NextResponse.json({ ok: true });
}
'@

Write-ProjectFile "app/api/users/route.js" @'
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteUserById, getInitialAdminEmails, getUserRole, listUsers, upsertUser } from '@/lib/db';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  const role = await getUserRole(session.user.email);
  if (role !== 'admin') return { error: NextResponse.json({ error: 'Solo administradores' }, { status: 403 }) };
  return { session };
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const users = await listUsers();
  return NextResponse.json({
    users,
    initialAdmins: getInitialAdminEmails(),
  });
}

export async function POST(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { email, name, role } = await request.json();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Ingresa un correo Gmail válido.' }, { status: 400 });
  }
  if (role !== 'admin' && role !== 'portero') {
    return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 });
  }

  const user = await upsertUser({ email, name: name || '', role });
  return NextResponse.json({ user });
}

export async function DELETE(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get('id'));
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  await deleteUserById(id);
  return NextResponse.json({ ok: true });
}
'@

Write-ProjectFile "app/globals.css" @'
:root {
  --navy: #1d2b72;
  --navy-dark: #141f54;
  --red: #b81d33;
  --gold: #f5ce00;
  --gold-soft: #fff8d6;
  --bg: #f4f6fa;
  --card: #ffffff;
  --text: #1a202c;
  --muted: #5a6578;
  --border: #dce2ec;
  --success: #157347;
  --success-bg: #e7f5ee;
  --danger-bg: #fdecef;
  --primary-bg: #eaf0ff;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
}

button, input, select, textarea {
  font-family: inherit;
}

.topbar {
  background: var(--navy);
  color: #fff;
  border-bottom: 4px solid var(--red);
  position: sticky;
  top: 0;
  z-index: 20;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
}

.topbar-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #fff;
  object-fit: contain;
  padding: 2px;
}

.brand h1 {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.brand p {
  font-size: 0.8rem;
  color: #d6def5;
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.role-pill {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  text-transform: uppercase;
}

.role-admin {
  background: var(--gold);
  color: var(--navy-dark);
}

.role-portero {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.35);
}

.btn {
  border: none;
  border-radius: 8px;
  padding: 9px 15px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-decoration: none;
  transition: opacity 0.15s, transform 0.08s;
}

.btn:hover { opacity: 0.92; }
.btn:active { transform: scale(0.98); }
.btn:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-primary { background: var(--navy); color: #fff; }
.btn-accent { background: var(--red); color: #fff; }
.btn-gold { background: var(--gold); color: var(--navy-dark); }
.btn-outline { background: #fff; color: var(--navy); border: 1px solid var(--border); }
.btn-ghost-white { background: rgba(255,255,255,0.14); color: #fff; border: 1px solid rgba(255,255,255,0.28); }
.btn-sm { padding: 6px 10px; font-size: 0.8rem; }
.btn-danger-outline { background: #fff; color: var(--red); border: 1px solid #f0b8c0; }

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px 16px 48px;
}

.center-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(155deg, var(--navy) 0%, #27398f 55%, var(--red) 100%);
}

.auth-card {
  background: #fff;
  border-radius: 16px;
  padding: 36px 28px;
  max-width: 430px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.25);
  border-top: 6px solid var(--gold);
}

.auth-card img {
  width: 120px;
  height: 120px;
  object-fit: contain;
  margin-bottom: 14px;
}

.auth-card h2 {
  color: var(--navy);
  font-size: 1.35rem;
  margin-bottom: 6px;
}

.auth-card p {
  color: var(--muted);
  font-size: 0.92rem;
  margin-bottom: 22px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.stat-card {
  background: var(--card);
  border-radius: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-left: 4px solid var(--navy);
}

.stat-card.stat-today {
  border-left-color: var(--red);
  background: #fffafa;
}

.stat-value {
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--navy);
  line-height: 1.1;
}

.stat-today .stat-value { color: var(--red); }

.stat-label {
  font-size: 0.82rem;
  color: var(--muted);
  margin-top: 4px;
}

.toolbar {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tab {
  background: var(--bg);
  color: var(--muted);
  border: 1px solid var(--border);
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
}

.tab.active {
  background: var(--navy);
  color: #fff;
  border-color: var(--navy);
}

.filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filters select {
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #fff;
  font-size: 0.86rem;
  color: var(--text);
}

.day-group {
  margin-bottom: 24px;
}

.day-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 2px solid var(--border);
}

.day-header h3 {
  font-size: 1.05rem;
  color: var(--navy);
  text-transform: capitalize;
}

.hoy-pill {
  background: var(--red);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 3px 9px;
  border-radius: 999px;
  letter-spacing: 0.5px;
}

.notices-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 14px;
}

.notice-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 15px 16px;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notice-card.is-today {
  border-color: #eab3b9;
  box-shadow: 0 3px 12px rgba(184, 29, 51, 0.08);
}

.notice-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
}

.badge-warning { background: var(--gold-soft); color: #7a5d00; border: 1px solid #f0dc7a; }
.badge-danger { background: var(--danger-bg); color: var(--red); border: 1px solid #f4c2c9; }
.badge-primary { background: var(--primary-bg); color: var(--navy); border: 1px solid #c5d4f7; }

.level-tag {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--muted);
}

.notice-courses {
  font-size: 1.08rem;
  font-weight: 700;
  color: var(--navy);
}

.notice-time-box {
  background: var(--bg);
  border-radius: 8px;
  padding: 8px 11px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
}

.notice-meta {
  font-size: 0.85rem;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notice-meta strong { color: var(--text); }

.notice-footer {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.cal-status {
  font-size: 0.74rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 6px;
}

.cal-ok { background: var(--success-bg); color: var(--success); }
.cal-err { background: var(--danger-bg); color: var(--red); }

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 50;
}

.modal {
  background: #fff;
  border-radius: 14px;
  max-width: 580px;
  width: 100%;
  max-height: 92vh;
  overflow-y: auto;
  padding: 22px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  border-top: 5px solid var(--navy);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.modal-header h3 {
  color: var(--navy);
  font-size: 1.15rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 12px;
}

.form-group.full {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--navy);
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-size: 0.9rem;
}

.courses-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.course-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  font-size: 0.84rem;
  cursor: pointer;
  user-select: none;
}

.course-chip.selected {
  background: var(--navy);
  color: #fff;
  border-color: var(--navy);
}

.error-box {
  background: var(--danger-bg);
  color: var(--red);
  border: 1px solid #f2b8c0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  margin-bottom: 12px;
}

.empty-state {
  background: #fff;
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 36px 20px;
  text-align: center;
  color: var(--muted);
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.user-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
}

@media (max-width: 600px) {
  .form-grid { grid-template-columns: 1fr; }
}
'@

Write-ProjectFile "app/layout.js" @'
import './globals.css';
import AuthProvider from '@/components/AuthProvider';

export const metadata = {
  title: 'Portería y Horarios | Instituto San Juan Pablo II',
  description: 'Avisos de entradas tarde, salidas anticipadas y salidas educativas para portería.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
'@

Write-ProjectFile "app/page.js" @'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Dashboard from '@/components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const calendarUrl = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_URL || '';

  return <Dashboard session={session} calendarUrl={calendarUrl} />;
}
'@

Write-ProjectFile "components/AuthProvider.jsx" @'
'use client';

import { SessionProvider } from 'next-auth/react';

export default function AuthProvider({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
'@

Write-ProjectFile "components/NoticeFormModal.jsx" @'
'use client';

import { useState, useEffect } from 'react';
import { LEVELS, NOTICE_TYPES, getTodayArgentina } from '@/lib/constants';

export default function NoticeFormModal({ initialNotice, onClose, onSaved }) {
  const isEditing = Boolean(initialNotice);
  const today = getTodayArgentina();

  const [type, setType] = useState(initialNotice?.type || 'entrada_tarde');
  const [level, setLevel] = useState(initialNotice?.level || 'Secundario');
  const [turn, setTurn] = useState(initialNotice?.turn || 'Mañana');
  const [courses, setCourses] = useState(initialNotice?.courses || []);
  const [eventDate, setEventDate] = useState(initialNotice?.event_date || today);
  const [startTime, setStartTime] = useState(initialNotice?.start_time || '08:30');
  const [returnDate, setReturnDate] = useState(initialNotice?.return_date || today);
  const [returnTime, setReturnTime] = useState(initialNotice?.return_time || '12:00');
  const [destination, setDestination] = useState(initialNotice?.destination || '');
  const [teachers, setTeachers] = useState(initialNotice?.teachers || '');
  const [transport, setTransport] = useState(initialNotice?.transport || '');
  const [notes, setNotes] = useState(initialNotice?.notes || '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const allowed = NOTICE_TYPES[type].allowedLevels;
    if (!allowed.includes(level)) {
      setLevel(allowed[0]);
      setTurn('Mañana');
      setCourses([]);
    }
  }, [type, level]);

  const availableTurns = Object.keys(LEVELS[level]?.turns || {});
  const availableCourses = LEVELS[level]?.turns[turn] || [];

  function handleLevelChange(newLevel) {
    setLevel(newLevel);
    const turns = Object.keys(LEVELS[newLevel].turns);
    setTurn(turns[0]);
    setCourses([]);
  }

  function handleTurnChange(newTurn) {
    setTurn(newTurn);
    setCourses([]);
  }

  function toggleCourse(course) {
    setCourses((prev) =>
      prev.includes(course) ? prev.filter((c) => c !== course) : [...prev, course]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (courses.length === 0) {
      setError('Selecciona al menos un curso o sala.');
      return;
    }

    setSaving(true);
    try {
      const url = isEditing ? `/api/notices/${initialNotice.id}` : '/api/notices';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          level,
          turn,
          courses,
          event_date: eventDate,
          start_time: startTime,
          return_date: type === 'salida_educativa' ? returnDate : null,
          return_time: type === 'salida_educativa' ? returnTime : null,
          destination,
          teachers,
          transport,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar el aviso.');
        setSaving(false);
        return;
      }

      onSaved(data.notice);
    } catch {
      setError('Error de conexión al guardar.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>{isEditing ? 'Editar aviso' : 'Nuevo aviso para Portería'}</h3>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full">
              <label>Tipo de aviso</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                {Object.entries(NOTICE_TYPES).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label} {meta.allowedLevels.length === 1 ? '(Solo Secundario)' : '(3 Niveles)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Nivel</label>
              <select value={level} onChange={(e) => handleLevelChange(e.target.value)}>
                {NOTICE_TYPES[type].allowedLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {LEVELS[lvl].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Turno</label>
              <select value={turn} onChange={(e) => handleTurnChange(e.target.value)}>
                {availableTurns.map((t) => (
                  <option key={t} value={t}>
                    Turno {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full">
              <label>Curso(s) / Sala(s)</label>
              <div className="courses-chips">
                {availableCourses.map((course) => {
                  const selected = courses.includes(course);
                  return (
                    <button
                      type="button"
                      key={course}
                      className={`course-chip ${selected ? 'selected' : ''}`}
                      onClick={() => toggleCourse(course)}
                    >
                      {selected ? '✓ ' : ''}
                      {course}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label>{type === 'salida_educativa' ? 'Fecha de salida' : 'Fecha'}</label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => {
                  setEventDate(e.target.value);
                  if (!isEditing && returnDate < e.target.value) {
                    setReturnDate(e.target.value);
                  }
                }}
              />
            </div>

            <div className="form-group">
              <label>
                {type === 'entrada_tarde'
                  ? 'Hora nueva de entrada'
                  : type === 'salida_anticipada'
                  ? 'Hora de salida anticipada'
                  : 'Hora de salida'}
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            {type === 'salida_educativa' && (
              <>
                <div className="form-group">
                  <label>Fecha estimada de regreso</label>
                  <input
                    type="date"
                    required
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Hora estimada de regreso</label>
                  <input
                    type="time"
                    required
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                  />
                </div>

                <div className="form-group full">
                  <label>Destino / Actividad</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Museo de Ciencias / Granja Educativa"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Docentes responsables</label>
                  <input
                    type="text"
                    placeholder="Ej: Prof. García, Prof. López"
                    value={teachers}
                    onChange={(e) => setTeachers(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Transporte / Micro (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej: Empresa Sur / Micro patente..."
                    value={transport}
                    onChange={(e) => setTransport(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="form-group full">
              <label>Observaciones para portería (opcional)</label>
              <textarea
                rows={2}
                placeholder="Ej: Ingresan por portón lateral / Sin docente en 1ª hora"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando y subiendo a Calendar...' : isEditing ? 'Guardar cambios' : 'Publicar y subir a Calendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
'@

Write-ProjectFile "components/UsersModal.jsx" @'
'use client';

import { useState, useEffect } from 'react';

export default function UsersModal({ onClose }) {
  const [users, setUsers] = useState([]);
  const [initialAdmins, setInitialAdmins] = useState([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('portero');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setInitialAdmins(data.initialAdmins || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al guardar usuario');
      } else {
        setEmail('');
        setName('');
        await loadUsers();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Quitar acceso a este correo?')) return;
    await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    await loadUsers();
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>Usuarios autorizados (Gmail)</h3>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleAdd} className="form-grid" style={{ marginBottom: 14 }}>
          <div className="form-group">
            <label>Correo Gmail</label>
            <input
              type="email"
              required
              placeholder="nombre@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Nombre (opcional)</label>
            <input
              type="text"
              placeholder="Ej: Juan (Portero)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Rol</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="portero">Portero (Solo lectura)</option>
              <option value="admin">Administrador (Carga y edita)</option>
            </select>
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : '+ Autorizar correo'}
            </button>
          </div>
        </form>

        {initialAdmins.length > 0 && (
          <div style={{ fontSize: '0.8rem', color: '#5a6578', marginBottom: 10 }}>
            <strong>Admins fijos (configurados en Vercel):</strong> {initialAdmins.join(', ')}
          </div>
        )}

        {loading ? (
          <p>Cargando usuarios...</p>
        ) : users.length === 0 ? (
          <p style={{ fontSize: '0.88rem', color: '#5a6578' }}>
            Aún no agregaste usuarios adicionales desde este panel.
          </p>
        ) : (
          <div className="users-list">
            {users.map((u) => (
              <div key={u.id} className="user-row">
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {u.email} {u.name ? `(${u.name})` : ''}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#5a6578' }}>
                    Rol: {u.role === 'admin' ? 'Administrador' : 'Portero (Solo lectura)'}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-danger-outline btn-sm"
                  onClick={() => handleDelete(u.id)}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
'@

Write-ProjectFile "components/Dashboard.jsx" @'
'use client';

import { useState, useEffect, useMemo } from 'react';
import { signIn, signOut } from 'next-auth/react';
import { NOTICE_TYPES, formatDateAR, getTodayArgentina } from '@/lib/constants';
import NoticeFormModal from './NoticeFormModal';
import UsersModal from './UsersModal';

export default function Dashboard({ session, calendarUrl }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('upcoming');
  const [levelFilter, setLevelFilter] = useState('all');
  const [turnFilter, setTurnFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [showUsers, setShowUsers] = useState(false);

  const user = session?.user;
  const role = user?.role;
  const isAdmin = role === 'admin';
  const isAuthorized = role === 'admin' || role === 'portero';
  const today = getTodayArgentina();

  async function fetchNotices() {
    setLoading(true);
    try {
      const res = await fetch('/api/notices');
      if (res.ok) {
        const data = await res.json();
        setNotices(data.notices || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthorized) {
      fetchNotices();
    }
  }, [isAuthorized]);

  const todayCount = useMemo(
    () => notices.filter((n) => n.event_date === today).length,
    [notices, today]
  );
  const tripsTodayCount = useMemo(
    () => notices.filter((n) => n.event_date === today && n.type === 'salida_educativa').length,
    [notices, today]
  );
  const upcomingCount = useMemo(
    () => notices.filter((n) => n.event_date > today).length,
    [notices, today]
  );

  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      if (tab === 'today' && n.event_date !== today) return false;
      if (tab === 'upcoming' && n.event_date < today) return false;
      if (tab === 'history' && n.event_date >= today) return false;
      if (levelFilter !== 'all' && n.level !== levelFilter) return false;
      if (turnFilter !== 'all' && n.turn !== turnFilter) return false;
      if (typeFilter !== 'all' && n.type !== typeFilter) return false;
      return true;
    });
  }, [notices, tab, today, levelFilter, turnFilter, typeFilter]);

  const groupedByDate = useMemo(() => {
    const map = new Map();
    const list = tab === 'history' ? [...filteredNotices].reverse() : filteredNotices;
    for (const item of list) {
      if (!map.has(item.event_date)) map.set(item.event_date, []);
      map.get(item.event_date).push(item);
    }
    return Array.from(map.entries());
  }, [filteredNotices, tab]);

  async function handleDelete(notice) {
    if (!confirm(`¿Eliminar este aviso (${notice.courses.join(', ')})? También se quitará de Google Calendar.`)) {
      return;
    }
    const res = await fetch(`/api/notices/${notice.id}`, { method: 'DELETE' });
    if (res.ok) {
      setNotices((prev) => prev.filter((n) => n.id !== notice.id));
    }
  }

  if (!session) {
    return (
      <div className="center-screen">
        <div className="auth-card">
          <img src="/logo.png" alt="Instituto San Juan Pablo II" />
          <h2>Instituto San Juan Pablo II</h2>
          <p>Sistema de información para Portería: cambios de horarios y salidas educativas.</p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px 16px' }}
            onClick={() => signIn('google')}
          >
            Ingresar con Google
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="center-screen">
        <div className="auth-card">
          <img src="/logo.png" alt="Instituto San Juan Pablo II" />
          <h2>Acceso pendiente de autorización</h2>
          <p>
            Ingresaste con <strong>{user.email}</strong>, pero tu cuenta todavía no está habilitada como
            Administrador o Portero. Solicita a Dirección/Administración que agregue tu correo.
          </p>
          <button type="button" className="btn btn-outline" onClick={() => signOut()}>
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <img src="/logo.png" alt="Escudo" className="brand-logo" />
            <div>
              <h1>Instituto San Juan Pablo II</h1>
              <p>Información de Portería y Salidas Educativas</p>
            </div>
          </div>

          <div className="user-actions">
            <span className={`role-pill ${isAdmin ? 'role-admin' : 'role-portero'}`}>
              {isAdmin ? 'Administrador' : 'Portería (Solo lectura)'}
            </span>

            {calendarUrl && (
              <a
                href={calendarUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost-white btn-sm"
              >
                Ver Google Calendar
              </a>
            )}

            {isAdmin && (
              <>
                <button
                  type="button"
                  className="btn btn-ghost-white btn-sm"
                  onClick={() => setShowUsers(true)}
                >
                  Usuarios
                </button>
                <button
                  type="button"
                  className="btn btn-gold btn-sm"
                  onClick={() => {
                    setEditingNotice(null);
                    setShowForm(true);
                  }}
                >
                  + Nuevo Aviso
                </button>
              </>
            )}

            <button
              type="button"
              className="btn btn-ghost-white btn-sm"
              onClick={() => signOut()}
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        <section className="stats-grid">
          <div className="stat-card stat-today">
            <div className="stat-value">{todayCount}</div>
            <div className="stat-label">Avisos para HOY</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{tripsTodayCount}</div>
            <div className="stat-label">Salidas educativas HOY</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{upcomingCount}</div>
            <div className="stat-label">Próximos días programados</div>
          </div>
        </section>

        <section className="toolbar">
          <div className="tabs">
            <button
              type="button"
              className={`tab ${tab === 'upcoming' ? 'active' : ''}`}
              onClick={() => setTab('upcoming')}
            >
              Hoy y Próximos
            </button>
            <button
              type="button"
              className={`tab ${tab === 'today' ? 'active' : ''}`}
              onClick={() => setTab('today')}
            >
              Solo Hoy ({todayCount})
            </button>
            <button
              type="button"
              className={`tab ${tab === 'history' ? 'active' : ''}`}
              onClick={() => setTab('history')}
            >
              Pasados
            </button>
          </div>

          <div className="filters">
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
              <option value="all">Todos los niveles</option>
              <option value="Inicial">Inicial</option>
              <option value="Primario">Primario</option>
              <option value="Secundario">Secundario</option>
            </select>

            <select value={turnFilter} onChange={(e) => setTurnFilter(e.target.value)}>
              <option value="all">Ambos turnos</option>
              <option value="Mañana">Turno Mañana</option>
              <option value="Tarde">Turno Tarde</option>
            </select>

            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">Todos los tipos</option>
              <option value="entrada_tarde">Entrada Tarde</option>
              <option value="salida_anticipada">Salida Anticipada</option>
              <option value="salida_educativa">Salida Educativa</option>
            </select>
          </div>
        </section>

        {loading ? (
          <div className="empty-state">Cargando avisos...</div>
        ) : groupedByDate.length === 0 ? (
          <div className="empty-state">
            No hay avisos para mostrar en esta vista.
          </div>
        ) : (
          groupedByDate.map(([dateStr, items]) => {
            const isToday = dateStr === today;
            return (
              <section key={dateStr} className="day-group">
                <div className="day-header">
                  {isToday && <span className="hoy-pill">HOY</span>}
                  <h3>{formatDateAR(dateStr)}</h3>
                </div>

                <div className="notices-grid">
                  {items.map((n) => {
                    const meta = NOTICE_TYPES[n.type] || {};
                    return (
                      <article key={n.id} className={`notice-card ${isToday ? 'is-today' : ''}`}>
                        <div className="notice-top">
                          <span className={`badge ${meta.badgeClass || 'badge-primary'}`}>
                            {meta.shortLabel || n.type}
                          </span>
                          <span className="level-tag">
                            {n.level} · Turno {n.turn}
                          </span>
                        </div>

                        <div className="notice-courses">{n.courses.join(', ')}</div>

                        <div className="notice-time-box">
                          {n.type === 'entrada_tarde' && `Ingresan a las ${n.start_time} hs`}
                          {n.type === 'salida_anticipada' && `Se retiran a las ${n.start_time} hs`}
                          {n.type === 'salida_educativa' && (
                            <>
                              Salida: {n.start_time} hs
                              {n.return_time
                                ? ` · Regreso: ${n.return_date && n.return_date !== n.event_date ? `${n.return_date} ` : ''}${n.return_time} hs`
                                : ''}
                            </>
                          )}
                        </div>

                        <div className="notice-meta">
                          {n.destination && (
                            <div>
                              <strong>Destino:</strong> {n.destination}
                            </div>
                          )}
                          {n.teachers && (
                            <div>
                              <strong>Docentes:</strong> {n.teachers}
                            </div>
                          )}
                          {n.transport && (
                            <div>
                              <strong>Transporte:</strong> {n.transport}
                            </div>
                          )}
                          {n.notes && (
                            <div>
                              <strong>Obs:</strong> {n.notes}
                            </div>
                          )}
                        </div>

                        <div className="notice-footer">
                          <span className={`cal-status ${n.google_event_id ? 'cal-ok' : 'cal-err'}`}>
                            {n.google_event_id
                              ? '✓ En Google Calendar'
                              : n.calendar_error
                              ? `Sin Calendar (${n.calendar_error})`
                              : 'Sin sincronizar'}
                          </span>

                          {isAdmin && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => {
                                  setEditingNotice(n);
                                  setShowForm(true);
                                }}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger-outline btn-sm"
                                onClick={() => handleDelete(n)}
                              >
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </main>

      {showForm && (
        <NoticeFormModal
          initialNotice={editingNotice}
          onClose={() => {
            setShowForm(false);
            setEditingNotice(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingNotice(null);
            fetchNotices();
          }}
        />
      )}

      {showUsers && <UsersModal onClose={() => setShowUsers(false)} />}
    </div>
  );
}
'@

Write-Host "`n¡Listo! Ahora coloca el logo en public\logo.png, borra este script y sube todo a GitHub." -ForegroundColor Cyan