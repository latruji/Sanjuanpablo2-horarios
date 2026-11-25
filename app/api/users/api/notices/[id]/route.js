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
