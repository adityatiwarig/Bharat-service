import { sessionMeHandler } from '@/lib/server/auth-handlers';

export async function GET() {
  return sessionMeHandler();
}
