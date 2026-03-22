import { loginHandler } from '@/lib/server/auth-handlers';

export async function POST(request: Request) {
  return loginHandler(request);
}
