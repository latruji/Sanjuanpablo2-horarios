import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { isPortero } from "@/lib/authorizedUsers";
import { sql } from "@/lib/db";

export async function POST(req) {
  const session = await getServerSession();

  if (!session || !isPortero(session.user.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const subscription = await req.json();

  try {
    await sql`
      INSERT INTO push_subscriptions (email, endpoint, p256dh, auth)
      VALUES (
        ${session.user.email},
        ${subscription.endpoint},
        ${subscription.keys.p256dh},
        ${subscription.keys.auth}
      )
      ON CONFLICT (endpoint) DO UPDATE SET
        email = EXCLUDED.email,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth
    `;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}