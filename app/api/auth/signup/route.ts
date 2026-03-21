import { NextResponse } from 'next/server';

import { AuthError, signupCitizen, toSessionUser } from '@/lib/server/auth';
import { attachSessionCookie } from '@/lib/server/session';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
    };

    if (!body.name?.trim() || !body.email?.trim() || !body.password?.trim()) {
      return NextResponse.json(
        { error: 'Name, email, and password are required.' },
        { status: 400 },
      );
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
