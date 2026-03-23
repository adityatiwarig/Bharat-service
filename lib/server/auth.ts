import 'server-only';

import { redirect } from 'next/navigation';

import { query } from '@/lib/server/db';
import { hashPassword, verifyPassword } from '@/lib/server/password';
import { getSessionPayload } from '@/lib/server/session';
import type { ComplaintDepartment, User, UserRole, UserSession } from '@/lib/types';

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

type UserRow = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string | null;
  ward_id: number | null;
  department: ComplaintDepartment | null;
  created_at: string;
  updated_at: string;
};

function normalizeCitizenPhone(phone?: string) {
  const digits = (phone ?? '').replace(/\D/g, '');

  if (!digits) {
    return null;
  }

  let normalized = digits;

  if (normalized.startsWith('91') && normalized.length === 12) {
    normalized = normalized.slice(2);
  } else if (normalized.startsWith('0') && normalized.length === 11) {
    normalized = normalized.slice(1);
  }

  if (normalized.length !== 10) {
    throw new AuthError('Enter a valid 10-digit mobile number.', 400);
  }

  return `+91${normalized}`;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    full_name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    phone: row.phone,
    ward_id: row.ward_id,
    department: row.department,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function assertLeaderDepartment(user: User) {
  if (user.role === 'leader' && !user.department) {
    throw new AuthError('This department head account has no department assigned. Use a department-specific head account.', 403);
  }
}

export function toSessionUser(user: User): UserSession {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    ward_id: user.ward_id,
    department: user.department,
  };
}

export async function getUserById(id: string) {
  const result = await query<UserRow>(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.password,
        u.role,
        u.phone,
        w.ward_id AS ward_id,
        COALESCE(w.department, u.department) AS department,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN workers w ON w.user_id = u.id
      WHERE u.id = $1
      LIMIT 1
    `,
    [id],
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function getUserByEmail(email: string) {
  const result = await query<UserRow>(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.password,
        u.role,
        u.phone,
        w.ward_id AS ward_id,
        COALESCE(w.department, u.department) AS department,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN workers w ON w.user_id = u.id
      WHERE LOWER(u.email) = LOWER($1)
      LIMIT 1
    `,
    [email],
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function signupCitizen(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) {
  const existing = await getUserByEmail(input.email);

  if (existing) {
    throw new AuthError('An account with this email already exists.', 409);
  }

  const passwordHash = await hashPassword(input.password);
  const normalizedPhone = normalizeCitizenPhone(input.phone);
  const result = await query<UserRow>(
    `
      INSERT INTO users (name, email, password, role, phone)
      VALUES ($1, $2, $3, 'citizen', $4)
      RETURNING
        id,
        name,
        email,
        password,
        role,
        phone,
        NULL::text AS department,
        NULL::integer AS ward_id,
        created_at,
        updated_at
    `,
    [input.name.trim(), input.email.trim().toLowerCase(), passwordHash, normalizedPhone],
  );

  return mapUser(result.rows[0]);
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await getUserByEmail(input.email.trim().toLowerCase());

  if (!user) {
    throw new AuthError('Invalid email or password.', 401);
  }

  const isValid = await verifyPassword(input.password, user.password || '');

  if (!isValid) {
    throw new AuthError('Invalid email or password.', 401);
  }

  assertLeaderDepartment(user);
  return user;
}

export async function getCurrentUser() {
  const payload = await getSessionPayload();

  if (!payload) {
    return null;
  }

  return getUserById(payload.id);
}

export async function requireUser(allowedRoles?: UserRole[]) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect(`/${user.role}`);
  }

  if (user.role === 'leader' && !user.department) {
    redirect('/worker-login');
  }

  return user;
}

export async function requireApiUser(allowedRoles?: UserRole[]) {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthError('Authentication is required.', 401);
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new AuthError('You are not allowed to perform this action.', 403);
  }

  assertLeaderDepartment(user);
  return user;
}
