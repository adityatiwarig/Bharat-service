import { SessionProvider } from '@/components/session-provider';
import { requireUser } from '@/lib/server/auth';

export default async function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(['worker']);

  return <SessionProvider user={user}>{children}</SessionProvider>;
}
