import { SessionProvider } from '@/components/session-provider';
import { requireUser } from '@/lib/server/auth';

export default async function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(['citizen']);

  return <SessionProvider user={user}>{children}</SessionProvider>;
}
