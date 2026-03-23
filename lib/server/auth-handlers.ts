import { NextResponse } from 'next/server';

import {
  AuthError,
  getCurrentUser,
  getHomePathForUser,
  loginUser,
  signupCitizen,
  toSessionUser,
} from '@/lib/server/auth';
import { attachSessionCookie, clearSessionCookie, createSessionToken } from '@/lib/server/session';

export async function loginHandler(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string; portal?: 'citizen' | 'internal' };

    if (!body.email?.trim() || !body.password?.trim()) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const user = await loginUser({
      email: body.email,
      password: body.password,
      portal: body.portal,
    });

    const sessionUser = toSessionUser(user);
    const token = createSessionToken(sessionUser);
    const redirect_to = user.redirect_to || getHomePathForUser(user);

    const response = NextResponse.json({
      token,
      redirect_to,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        auth_source: user.auth_source,
        ward_id: user.ward_id,
        department: user.department,
        officer_id: user.officer_id,
        officer_level: user.officer_level,
        officer_role: user.officer_role,
        officer_department_id: user.officer_department_id,
        officer_department_name: user.officer_department_name,
        officer_zone_id: user.officer_zone_id,
        officer_ward_id: user.officer_ward_id,
      },
    });

    attachSessionCookie(response, sessionUser);
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

    const sessionUser = toSessionUser(user);
    const token = createSessionToken(sessionUser);
    const redirect_to = user.redirect_to || getHomePathForUser(user);
    const response = NextResponse.json({
      token,
      redirect_to,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        auth_source: user.auth_source,
        ward_id: user.ward_id,
        officer_id: user.officer_id,
        officer_level: user.officer_level,
        officer_role: user.officer_role,
        officer_department_id: user.officer_department_id,
        officer_department_name: user.officer_department_name,
        officer_zone_id: user.officer_zone_id,
        officer_ward_id: user.officer_ward_id,
      },
    });

    attachSessionCookie(response, sessionUser);
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
      auth_source: user.auth_source,
      ward_id: user.ward_id,
      department: user.department,
      officer_id: user.officer_id,
      officer_level: user.officer_level,
      officer_role: user.officer_role,
      officer_department_id: user.officer_department_id,
      officer_department_name: user.officer_department_name,
      officer_zone_id: user.officer_zone_id,
      officer_ward_id: user.officer_ward_id,
      redirect_to: user.redirect_to,
    },
  });
}

export async function logoutHandler() {
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
