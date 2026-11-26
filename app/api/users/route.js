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
    return NextResponse.json({ error: 'Ingresa un correo Gmail v\u00e1lido.' }, { status: 400 });
  }
  if (role !== 'admin' && role !== 'portero') {
    return NextResponse.json({ error: 'Rol inv\u00e1lido.' }, { status: 400 });
  }

  const user = await upsertUser({ email, name: name || '', role });
  return NextResponse.json({ user });
}

export async function DELETE(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get('id'));
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'ID inv\u00e1lido' }, { status: 400 });

  await deleteUserById(id);
  return NextResponse.json({ ok: true });
}