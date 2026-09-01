import webpush from "web-push";
import { sql } from "./db";
import { PORTERO_EMAILS } from "./authorizedUsers";

webpush.setVapidDetails(
  "mailto:contacto@sanjuanpablo2.edu.ar",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function notificarPorteros(titulo, cuerpo) {
  let subs;
  try {
    const result = await sql`
      SELECT * FROM push_subscriptions
      WHERE email = ANY(${PORTERO_EMAILS})
    `;
    subs = result.rows;
  } catch (err) {
    console.error("Error buscando suscripciones:", err);
    return;
  }

  const payload = JSON.stringify({ title: titulo, body: cuerpo });

  await Promise.all(
    (subs || []).map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
        } else {
          console.error("Error enviando push:", err);
        }
      }
    })
  );
}