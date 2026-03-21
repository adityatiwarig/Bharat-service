import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import type { UserSession } from '@/lib/types';

const COOKIE_NAME = 'govcrm_session';

function getSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error('SESSION_SECRET is not configured.');
  }

  return secret;
}

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf-8').toString('base64url');
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf-8');
}

function signPayload(payload: string) {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export function createSessionToken(user: UserSession) {
  const payload = toBase64Url(JSON.stringify(user));
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

export function parseSessionToken(token?: string | null): UserSession | null {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split('.');

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return null;
  }

  try {
    return JSON.parse(fromBase64Url(payload)) as UserSession;
  } catch {
    return null;
  }
}

export async function getSessionPayload() {
  const cookieStore = await cookies();
  return parseSessionToken(cookieStore.get(COOKIE_NAME)?.value);
}

export function attachSessionCookie(response: NextResponse, user: UserSession) {
  response.cookies.set(COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
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
