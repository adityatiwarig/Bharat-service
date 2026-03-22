import { logoutHandler } from '@/lib/server/auth-handlers';

export async function POST() {
  return logoutHandler();
}
