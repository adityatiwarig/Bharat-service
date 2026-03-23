import { SessionProvider } from '@/components/session-provider';
import { requireOfficerUser } from '@/lib/server/auth';

export default async function L2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireOfficerUser(['L2']);

  return <SessionProvider user={user}>{children}</SessionProvider>;
}
