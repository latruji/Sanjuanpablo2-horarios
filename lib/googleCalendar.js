import { google } from "googleapis";
import { PORTERO_EMAILS } from "./authorizedUsers";

const TIPO_LABEL = {
  entrada_tarde: "Entrada tardía",
  salida_anticipada: "Salida anticipada",
  salida_educativa: "Salida educativa",
};

export async function crearEventoCalendar(accessToken, datos) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const {
    tipo,
    nivel,
    curso,
    fecha, // YYYY-MM-DD
    horaSalida, // HH:mm
    horaRegreso, // HH:mm (opcional)
    destino,
    observaciones,
  } = datos;

  const titulo = `${TIPO_LABEL[tipo] || tipo} - ${nivel}${curso ? " " + curso : ""}`;

  const descripcionPartes = [
    `Nivel: ${nivel}`,
    curso ? `Curso: ${curso}` : null,
    destino ? `Destino: ${destino}` : null,
    observaciones ? `Observaciones: ${observaciones}` : null,
  ].filter(Boolean);

  const startDateTime = `${fecha}T${horaSalida}:00`;
  const endDateTime = `${fecha}T${horaRegreso || horaSalida}:00`;

  const event = {
    summary: titulo,
    description: descripcionPartes.join("\n"),
    start: {
      dateTime: startDateTime,
      timeZone: "America/Argentina/Buenos_Aires",
    },
    end: {
      dateTime: endDateTime,
      timeZone: "America/Argentina/Buenos_Aires",
    },
    // Invitamos a los porteros: el evento se refleja en su propio Google Calendar
    attendees: PORTERO_EMAILS.map((email) => ({ email })),
    reminders: { useDefault: true },
  };

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
    sendUpdates: "all", // les llega el mail de invitación a los porteros
  });

  return res.data;
}