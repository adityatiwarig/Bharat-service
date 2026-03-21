import { NextRequest, NextResponse } from 'next/server';

function resolveMode(pathname: string[]) {
  const firstSegment = pathname[0]?.toLowerCase();

  if (firstSegment === 'login' || firstSegment === 'sign-in') {
    return 'login';
  }

  return 'signup';
}

export function GET(
  request: NextRequest,
  context: { params: Promise<{ pathname: string[] }> },
) {
  return context.params.then(({ pathname }) => {
    const target = new URL('/auth', request.url);
    const nextPath = request.nextUrl.searchParams.get('next');

    target.searchParams.set('mode', resolveMode(pathname));

    if (nextPath?.startsWith('/')) {
      target.searchParams.set('next', nextPath);
    }

    return NextResponse.redirect(target);
  });
}
