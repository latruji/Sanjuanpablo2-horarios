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