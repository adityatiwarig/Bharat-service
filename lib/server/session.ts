import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

import type { UserSession } from '@/lib/types';

const COOKIE_NAME = 'smartcrm_jwt';
const JWT_HEADER = {
  alg: 'HS256',
  typ: 'JWT',
} as const;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionJwtPayload = {
  sub: string;
  iss: 'smartcrm';
  aud: 'smartcrm';
  iat: number;
  exp: number;
  user: UserSession;
};

function getSecret() {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET or SESSION_SECRET must be configured.');
  }

  return secret;
}

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf-8').toString('base64url');
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf-8');
}

function sign(value: string) {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

function encodePart(value: object) {
  return toBase64Url(JSON.stringify(value));
}

function decodePart<T>(value: string) {
  return JSON.parse(fromBase64Url(value)) as T;
}

function extractBearerToken(request?: Request) {
  const header = request?.headers.get('authorization') || request?.headers.get('Authorization');

  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

export function createSessionToken(user: UserSession) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: SessionJwtPayload = {
    sub: user.id,
    iss: 'smartcrm',
    aud: 'smartcrm',
    iat: issuedAt,
    exp: issuedAt + TOKEN_TTL_SECONDS,
    user,
  };
  const header = encodePart(JWT_HEADER);
  const body = encodePart(payload);
  const signature = sign(`${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

export function parseSessionToken(token?: string | null): UserSession | null {
  if (!token) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    return null;
  }

  const signedValue = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = sign(signedValue);
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(encodedSignature);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return null;
  }

  try {
    const header = decodePart<typeof JWT_HEADER>(encodedHeader);
    const payload = decodePart<SessionJwtPayload>(encodedPayload);

    if (header.alg !== JWT_HEADER.alg || header.typ !== JWT_HEADER.typ) {
      return null;
    }

    if (payload.iss !== 'smartcrm' || payload.aud !== 'smartcrm') {
      return null;
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload.user || null;
  } catch {
    return null;
  }
}

export async function getSessionPayload(request?: Request) {
  const bearerToken = extractBearerToken(request);

  if (bearerToken) {
    return parseSessionToken(bearerToken);
  }

  if (!request) {
    const headerStore = await headers();
    const implicitBearer = extractBearerToken(
      new Request('http://localhost', {
        headers: {
          authorization: headerStore.get('authorization') || '',
        },
      }),
    );

    if (implicitBearer) {
      return parseSessionToken(implicitBearer);
    }
  }

  const cookieStore = await cookies();
  return parseSessionToken(cookieStore.get(COOKIE_NAME)?.value);
}

export function attachSessionCookie(response: NextResponse, user: UserSession) {
  response.cookies.set(COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TOKEN_TTL_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
