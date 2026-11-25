import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Dashboard from '@/components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const calendarUrl = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_URL || '';

  return <Dashboard session={session} calendarUrl={calendarUrl} />;
}