import { SessionProvider } from '@/components/session-provider';
import { requireUser } from '@/lib/server/auth';

export default async function LeaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(['leader']);

  return <SessionProvider user={user}>{children}</SessionProvider>;
}
