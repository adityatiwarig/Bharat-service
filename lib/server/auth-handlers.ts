import { NextResponse } from 'next/server';

import { AuthError, getCurrentUser, loginUser, signupCitizen, toSessionUser } from '@/lib/server/auth';
import { attachSessionCookie, clearSessionCookie } from '@/lib/server/session';

export async function loginHandler(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string; portal?: 'citizen' | 'internal' };

    if (!body.email?.trim() || !body.password?.trim()) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const user = await loginUser({
      email: body.email,
      password: body.password,
    });

    if (body.portal === 'citizen' && user.role !== 'citizen') {
      return NextResponse.json({ error: 'This login page is only for citizens.' }, { status: 403 });
    }

    if (body.portal === 'internal' && user.role === 'citizen') {
      return NextResponse.json({ error: 'Citizens should use the citizen portal login.' }, { status: 403 });
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        ward_id: user.ward_id,
        department: user.department,
      },
    });

    attachSessionCookie(response, toSessionUser(user));
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Login failed', error);
    return NextResponse.json({ error: 'Unable to login right now.' }, { status: 500 });
  }
}

export async function signupHandler(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
    };

    if (!body.name?.trim() || !body.email?.trim() || !body.password?.trim()) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    const user = await signupCitizen({
      name: body.name.trim(),
      email: body.email.trim(),
      password: body.password,
      phone: body.phone,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        ward_id: user.ward_id,
      },
    });

    attachSessionCookie(response, toSessionUser(user));
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Signup failed', error);
    return NextResponse.json({ error: 'Unable to create account right now.' }, { status: 500 });
  }
}

export async function sessionMeHandler() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      ward_id: user.ward_id,
      department: user.department,
    },
  });
}

export async function logoutHandler() {
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
