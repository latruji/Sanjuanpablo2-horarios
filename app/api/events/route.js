import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/authorizedUsers";
import { crearEventoCalendar } from "@/lib/googleCalendar";
import { notificarPorteros } from "@/lib/push";
import { sql } from "@/lib/db";

const TIPO_LABEL = {
  entrada_tarde: "Entrada tardía",
  salida_anticipada: "Salida anticipada",
  salida_educativa: "Salida educativa",
};

export async function POST(req) {
  const session = await getServerSession();

  if (!session || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const {
    tipo,
    nivel,
    curso,
    fecha,
    horaSalida,
    horaRegreso,
    destino,
    observaciones,
  } = body;

  if (!tipo || !nivel || !fecha || !horaSalida) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios (tipo, nivel, fecha, hora)" },
      { status: 400 }
    );
  }

  try {
    const eventoCalendar = await crearEventoCalendar(session.accessToken, {
      tipo,
      nivel,
      curso,
      fecha,
      horaSalida,
      horaRegreso,
      destino,
      observaciones,
    });

    await sql`
      INSERT INTO eventos (
        tipo, nivel, curso, fecha, hora_salida, hora_regreso,
        destino, observaciones, cargado_por, calendar_event_id
      ) VALUES (
        ${tipo}, ${nivel}, ${curso || null}, ${fecha}, ${horaSalida},
        ${horaRegreso || null}, ${destino || null}, ${observaciones || null},
        ${session.user.email}, ${eventoCalendar.id}
      )
    `;

    const titulo = `${TIPO_LABEL[tipo]} - ${nivel}${curso ? " " + curso : ""}`;
    const cuerpo = `${fecha} ${horaSalida}hs${destino ? " · " + destino : ""}`;
    await notificarPorteros(titulo, cuerpo);

    return NextResponse.json({ ok: true, evento: eventoCalendar });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Error creando el evento: " + err.message },
      { status: 500 }
    );
  }
}