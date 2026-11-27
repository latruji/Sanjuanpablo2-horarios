import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createNotice, getUserRole, listNotices } from '@/lib/db';
import { syncCreateCalendarEvent } from '@/lib/googleCalendar';
import { LEVELS, NOTICE_TYPES } from '@/lib/constants';

function validateNoticePayload(body) {
  const { type, level, turn, courses, event_date, start_time, return_date, return_time } = body;
  if (!NOTICE_TYPES[type]) return 'Tipo de aviso inv\u00e1lido.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date || '')) return 'Fecha inv\u00e1lida.';

  if (type === 'otros') {
    if (start_time && !/^\d{2}:\d{2}$/.test(start_time)) return 'Hora inv\u00e1lida.';
    if (!body.notes?.trim()) return 'Ingresa el motivo y la familia que visita en Observaciones.';
    return null;
  }

  if (!LEVELS[level]) return 'Nivel inv\u00e1lido.';
  if (!NOTICE_TYPES[type].allowedLevels.includes(level)) return `El tipo "${NOTICE_TYPES[type].label}" solo aplica a Secundario.`;
  const validCourses = LEVELS[level].turns[turn];
  if (!validCourses) return 'Turno inv\u00e1lido para ese nivel.';
  if (!Array.isArray(courses) || courses.length === 0) return 'Debes seleccionar al menos un curso/sala.';
  if (courses.some((c) => !validCourses.includes(c))) return 'Hay cursos inv\u00e1lidos para el nivel/turno elegido.';
  if (!/^\d{2}:\d{2}$/.test(start_time || '')) return 'Hora inv\u00e1lida.';

  if (type === 'salida_educativa') {
    if (!body.destination?.trim()) return 'Ingresa el destino o actividad de la salida educativa.';
    if (return_date && !/^\d{4}-\d{2}-\d{2}$/.test(return_date)) return 'Fecha de regreso inv\u00e1lida.';
    if (return_time && !/^\d{2}:\d{2}$/.test(return_time)) return 'Hora de regreso inv\u00e1lida.';
    if (return_date && return_time && `${return_date}T${return_time}` < `${event_date}T${start_time}`) {
      return 'La fecha y hora de regreso no pueden ser anteriores a la salida.';
    }
  }
  return null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const role = await getUserRole(session.user.email);
  if (role !== 'admin' && role !== 'portero') return NextResponse.json({ error: 'Usuario no autorizado' }, { status: 403 });
  const notices = await listNotices();
  return NextResponse.json({ notices, role });
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const role = await getUserRole(session.user.email);
  if (role !== 'admin') return NextResponse.json({ error: 'Solo los administradores pueden cargar avisos' }, { status: 403 });

  const body = await request.json();
  const validationError = validateNoticePayload(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const isOtros = body.type === 'otros';
  const payload = {
    type: body.type,
    level: isOtros ? 'General' : body.level,
    turn: isOtros ? 'General' : body.turn,
    courses: isOtros ? [] : body.courses,
    event_date: body.event_date,
    start_time: body.start_time || '',
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