import 'server-only';

import { redirect } from 'next/navigation';

import { query } from '@/lib/server/db';
import { hashPassword, verifyPassword } from '@/lib/server/password';
import { getSessionPayload } from '@/lib/server/session';
import type {
  ComplaintDepartment,
  OfficerLevel,
  OfficerRole,
  User,
  UserRole,
  UserSession,
} from '@/lib/types';

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
  officer_id: string | null;
  officer_level: OfficerLevel | null;
  officer_role: OfficerRole | null;
  officer_department_id: number | null;
  officer_department_name: string | null;
  officer_zone_id: number | null;
  officer_ward_id: number | null;
  created_at: string;
  updated_at: string;
};

type OfficerAuthRow = {
  officer_id: string;
  user_id: string | null;
  email: string;
  password: string;
};

function getUserSelect() {
  return `
    SELECT
      u.id,
      u.name,
      u.email,
      u.password,
      u.role,
      u.phone,
      w.ward_id AS ward_id,
      COALESCE(w.department, u.department) AS department,
      o.id AS officer_id,
      CASE
        WHEN o.role::text IN ('L1', 'L2', 'L3') THEN o.role::text
        ELSE NULL
      END AS officer_level,
      o.role::text AS officer_role,
      o.department_id AS officer_department_id,
      d.name AS officer_department_name,
      o.zone_id AS officer_zone_id,
      o.ward_id AS officer_ward_id,
      u.created_at,
      u.updated_at
    FROM users u
    LEFT JOIN workers w ON w.user_id = u.id
    LEFT JOIN officers o ON o.user_id = u.id
    LEFT JOIN departments d ON d.id = o.department_id
  `;
}

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

export function getHomePathForUser(user: Pick<UserSession, 'role' | 'officer_role'>) {
  if (user.officer_role === 'L1') return '/l1';
  if (user.officer_role === 'L2') return '/l2';
  if (user.officer_role === 'L3') return '/l3';
  if (user.officer_role === 'ADMIN') return '/admin';
  if (user.role === 'worker') return '/worker';
  if (user.role === 'admin') return '/admin';
  if (user.role === 'leader') return '/leader';
  return '/citizen';
}

function mapUser(row: UserRow, authSource: UserSession['auth_source'] = 'user'): User {
  const user: User = {
    id: row.id,
    name: row.name,
    full_name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    auth_source: authSource,
    phone: row.phone,
    ward_id: row.ward_id,
    department: row.department,
    officer_id: row.officer_id,
    officer_level: row.officer_level,
    officer_role: row.officer_role,
    officer_department_id: row.officer_department_id,
    officer_department_name: row.officer_department_name,
    officer_zone_id: row.officer_zone_id,
    officer_ward_id: row.officer_ward_id,
    redirect_to: '/',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  user.redirect_to = getHomePathForUser(user);
  return user;
}

function assertLeaderDepartment(user: User) {
  if (user.role === 'leader' && !user.department) {
    throw new AuthError('This department head account has no department assigned. Use a department-specific head account.', 403);
  }
}

export function toSessionUser(user: User): UserSession {
  const sessionUser: UserSession = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    auth_source: user.auth_source,
    phone: user.phone,
    ward_id: user.ward_id,
    department: user.department,
    officer_id: user.officer_id,
    officer_level: user.officer_level,
    officer_role: user.officer_role,
    officer_department_id: user.officer_department_id,
    officer_department_name: user.officer_department_name,
    officer_zone_id: user.officer_zone_id,
    officer_ward_id: user.officer_ward_id,
    redirect_to: getHomePathForUser(user),
  };

  return sessionUser;
}

export async function getUserById(id: string) {
  const result = await query<UserRow>(
    `
      ${getUserSelect()}
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
      ${getUserSelect()}
      WHERE LOWER(u.email) = LOWER($1)
      LIMIT 1
    `,
    [email],
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

async function getOfficerAuthByIdentifier(identifier: string) {
  const result = await query<OfficerAuthRow>(
    `
      SELECT
        o.id AS officer_id,
        o.user_id,
        o.email,
        o.password
      FROM officers o
      WHERE LOWER(o.email) = LOWER($1)
         OR LOWER(SPLIT_PART(o.email, '@', 1)) = LOWER($1)
         OR LOWER(o.id::text) = LOWER($1)
      LIMIT 1
    `,
    [identifier],
  );

  return result.rows[0] || null;
}

async function loginLinkedOfficer(input: { identifier: string; password: string }) {
  const officer = await getOfficerAuthByIdentifier(input.identifier);

  if (!officer) {
    return null;
  }

  const isValid = await verifyPassword(input.password, officer.password || '');

  if (!isValid) {
    throw new AuthError('Invalid email or password.', 401);
  }

  if (!officer.user_id) {
    throw new AuthError('Officer account is not linked to an internal user.', 403);
  }

  const user = await getUserById(officer.user_id);

  if (!user) {
    throw new AuthError('Officer account is linked to a missing internal user.', 403);
  }

  return {
    ...user,
    auth_source: 'officer' as const,
    redirect_to: getHomePathForUser(user),
  };
}

async function loginStandardUser(input: { email: string; password: string }) {
  const user = await getUserByEmail(input.email.trim().toLowerCase());

  if (!user) {
    throw new AuthError('Invalid email or password.', 401);
  }

  const isValid = await verifyPassword(input.password, user.password || '');

  if (!isValid) {
    throw new AuthError('Invalid email or password.', 401);
  }

  assertLeaderDepartment(user);
  return {
    ...user,
    auth_source: 'user' as const,
    redirect_to: getHomePathForUser(user),
  };
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
        NULL::uuid AS officer_id,
        NULL::text AS officer_level,
        NULL::text AS officer_role,
        NULL::integer AS officer_department_id,
        NULL::text AS officer_department_name,
        NULL::integer AS officer_zone_id,
        NULL::integer AS officer_ward_id,
        created_at,
        updated_at
    `,
    [input.name.trim(), input.email.trim().toLowerCase(), passwordHash, normalizedPhone],
  );

  return mapUser(result.rows[0], 'user');
}

export async function loginUser(input: {
  email: string;
  password: string;
  portal?: 'citizen' | 'internal';
}) {
  const normalizedEmail = input.email.trim().toLowerCase();

  if (input.portal === 'citizen') {
    const user = await loginStandardUser({ email: normalizedEmail, password: input.password });

    if (user.role !== 'citizen') {
      throw new AuthError('This login page is only for citizens.', 403);
    }

    return user;
  }

  const officerUser = await loginLinkedOfficer({ identifier: normalizedEmail, password: input.password });

  if (officerUser) {
    return officerUser;
  }

  const user = await loginStandardUser({ email: normalizedEmail, password: input.password });

  if (user.role === 'citizen') {
    throw new AuthError('Citizens should use the citizen portal login.', 403);
  }

  return user;
}

export async function getCurrentUser(request?: Request) {
  const payload = await getSessionPayload(request);

  if (!payload) {
    return null;
  }

  const user = await getUserById(payload.id);

  if (!user) {
    return null;
  }

  return {
    ...user,
    auth_source: payload.auth_source || user.auth_source,
    redirect_to: getHomePathForUser(user),
  };
}

export async function requireUser(allowedRoles?: UserRole[], request?: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    redirect('/');
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect(getHomePathForUser(user));
  }

  if (user.role === 'leader' && !user.department) {
    redirect('/worker-login');
  }

  return user;
}

export async function requireOfficerUser(allowedOfficerRoles?: OfficerRole[], request?: Request) {
  const user = await requireUser(undefined, request);

  if (!user.officer_role) {
    redirect(getHomePathForUser(user));
  }

  if (allowedOfficerRoles && !allowedOfficerRoles.includes(user.officer_role)) {
    redirect(getHomePathForUser(user));
  }

  return user;
}

export async function requireApiUser(allowedRoles?: UserRole[], request?: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    throw new AuthError('Authentication is required.', 401);
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new AuthError('You are not allowed to perform this action.', 403);
  }

  assertLeaderDepartment(user);
  return user;
}

export async function requireApiOfficerUser(allowedOfficerRoles?: OfficerRole[], request?: Request) {
  const user = await requireApiUser(undefined, request);

  if (!user.officer_role) {
    throw new AuthError('Officer authentication is required.', 403);
  }

  if (allowedOfficerRoles && !allowedOfficerRoles.includes(user.officer_role)) {
    throw new AuthError('You are not allowed to access this officer panel.', 403);
  }

  return user;
}

export async function requireApiForwardingOfficer(request?: Request) {
  return requireApiOfficerUser(['L1', 'L2'], request);
}

export async function requireApiL3Officer(request?: Request) {
  return requireApiOfficerUser(['L3'], request);
}
