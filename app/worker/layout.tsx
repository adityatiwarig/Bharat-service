import { redirect } from 'next/navigation';

import { SessionProvider } from '@/components/session-provider';
import { requireUser } from '@/lib/server/auth';

export default async function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(['worker']);

  if (user.officer_role) {
    redirect(user.redirect_to || '/l1');
  }

  return <SessionProvider user={user}>{children}</SessionProvider>;
}
