import { SessionProvider } from '@/components/session-provider';
import { AdminWorkspaceProvider } from '@/components/admin-workspace';
import { requireUser } from '@/lib/server/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(['admin']);

  return (
    <SessionProvider user={user}>
      <AdminWorkspaceProvider>{children}</AdminWorkspaceProvider>
    </SessionProvider>
  );
}
