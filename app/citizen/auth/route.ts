import { NextRequest, NextResponse } from 'next/server';

function buildLegacyAuthUrl(request: NextRequest) {
  const target = new URL('/auth', request.url);
  const nextPath = request.nextUrl.searchParams.get('next');
  const mode = request.nextUrl.searchParams.get('mode') || 'signup';

  target.searchParams.set('mode', mode);

  if (nextPath?.startsWith('/')) {
    target.searchParams.set('next', nextPath);
  }

  return target;
}

export function GET(request: NextRequest) {
  return NextResponse.redirect(buildLegacyAuthUrl(request));
}
