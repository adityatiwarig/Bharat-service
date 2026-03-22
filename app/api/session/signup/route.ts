import { signupHandler } from '@/lib/server/auth-handlers';

export async function POST(request: Request) {
  return signupHandler(request);
}
