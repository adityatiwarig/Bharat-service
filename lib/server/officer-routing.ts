import 'server-only';

import { revalidateTag } from 'next/cache';

import { invalidateComplaintCache } from '@/lib/server/complaint-cache';
import { AuthError } from '@/lib/server/auth';
import type { DbTransactionClient } from '@/lib/server/db';
import { query, withTransaction } from '@/lib/server/db';
import { createNotificationForUser } from '@/lib/server/notifications';
import { saveProofImage } from '@/lib/server/uploads';
import type { Complaint, ComplaintHistoryAction, Officer, OfficerLevel, OfficerRole, User } from '@/lib/types';

type OfficerRow = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  role: OfficerRole;
  department_id: number;
  department_name: string | null;
  zone_id: number | null;
  zone_name: string | null;
  ward_id: number | null;
  ward_name: string | null;
  designation: string | null;
  created_at: string;
  updated_at: string;
};

type OfficerMappingRow = {
  id: number;
  zone_id: number;
  ward_id: number;
  department_id: number;
  category_id: number;
  l1_officer_id: string;
  l2_officer_id: string;
  l3_officer_id: string;
  sla_l1: number;
  sla_l2: number;
  sla_l3: number;
};

type ComplaintRoutingRow = {
  id: string;
  complaint_id: string;
  tracking_code: string;
  title: string;
  user_id: string;
  zone_id: number | null;
  ward_id: number;
  department_id: number | null;
  category_id: number | null;
  assigned_officer_id: string | null;
  current_level: OfficerLevel | null;
  deadline: string | null;
  status: string;
  ward_name: string | null;
  department_name: string | null;
  category_name: string | null;
};

let complaintProofImagesColumnPromise: Promise<boolean> | null = null;
let complaintProofsTablePromise: Promise<boolean> | null = null;

function isLikelyImageUpload(file: File) {
  if (file.type?.startsWith('image/')) {
    return true;
  }

  return /\.(png|jpe?g|webp|gif|bmp|svg|heic|heif)$/i.test(file.name || '');
}

function mapOfficer(row: OfficerRow): Officer {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    email: row.email,
    role: row.role,
    department_id: row.department_id,
    department_name: row.department_name,
    zone_id: row.zone_id,
    zone_name: row.zone_name,
    ward_id: row.ward_id,
    ward_name: row.ward_name,
    designation: row.designation,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function appendComplaintUpdate(
  client: DbTransactionClient,
  input: {
    complaint_id: string;
    status: Complaint['status'];
    note?: string | null;
    updated_by_user_id?: string | null;
  },
) {
  await client.query(
    `
      INSERT INTO complaint_updates (complaint_id, status, note, updated_by_user_id)
      VALUES ($1, $2, $3, $4)
    `,
    [input.complaint_id, input.status, input.note || null, input.updated_by_user_id || null],
  );
}

async function appendComplaintHistory(
  client: DbTransactionClient,
  input: {
    complaint_id: string;
    action: ComplaintHistoryAction;
    from_officer?: string | null;
    to_officer?: string | null;
    level: OfficerLevel;
  },
) {
  await client.query(
    `
      INSERT INTO complaint_history (complaint_id, action, from_officer, to_officer, level)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [input.complaint_id, input.action, input.from_officer || null, input.to_officer || null, input.level],
  );
}

async function listAdminUserIds(client: DbTransactionClient) {
  const result = await client.query<{ id: string }>(
    `
      SELECT id
      FROM users
      WHERE role = 'admin'
    `,
  );

  return result.rows.map((row) => row.id);
}

async function getOfficerUserId(client: DbTransactionClient, officerId: string) {
  const result = await client.query<{ user_id: string | null }>(
    `
      SELECT user_id
      FROM officers
      WHERE id = $1
      LIMIT 1
    `,
    [officerId],
  );

  return result.rows[0]?.user_id || null;
}

async function getOfficerName(client: DbTransactionClient, officerId: string) {
  const result = await client.query<{ name: string }>(
    `
      SELECT name
      FROM officers
      WHERE id = $1
      LIMIT 1
    `,
    [officerId],
  );

  return result.rows[0]?.name || null;
}

async function getComplaintRoutingRow(client: DbTransactionClient, complaintId: string) {
  const result = await client.query<ComplaintRoutingRow>(
    `
      SELECT
        c.id,
        c.complaint_id,
        c.tracking_code,
        c.title,
        c.user_id,
        c.zone_id,
        c.ward_id,
        c.department_id,
        c.category_id,
        c.assigned_officer_id,
        c.current_level,
        c.deadline,
        c.status,
        w.name AS ward_name,
        d.name AS department_name,
        cat.name AS category_name
      FROM complaints c
      INNER JOIN wards w ON w.id = c.ward_id
      LEFT JOIN departments d ON d.id = c.department_id
      LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.id = $1
      LIMIT 1
    `,
    [complaintId],
  );

  return result.rows[0] || null;
}

async function invalidateComplaintReadCaches(
  complaint: Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'>,
) {
  await invalidateComplaintCache(complaint.complaint_id, [complaint.id, complaint.tracking_code]);
}

async function complaintsTableHasProofImagesColumn() {
  complaintProofImagesColumnPromise ??= query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'complaints'
        AND column_name = 'proof_images'
    `,
  )
    .then((result) => Number(result.rows[0]?.count || 0) > 0)
    .catch((error) => {
      complaintProofImagesColumnPromise = null;
      throw error;
    });

  return complaintProofImagesColumnPromise;
}

async function complaintProofsTableExists() {
  complaintProofsTablePromise ??= query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'complaint_proofs'
    `,
  )
    .then((result) => Number(result.rows[0]?.count || 0) > 0)
    .catch((error) => {
      complaintProofsTablePromise = null;
      throw error;
    });

  return complaintProofsTablePromise;
}

async function getOfficerMapping(
  client: DbTransactionClient,
  input: {
    zone_id: number;
    ward_id: number;
    department_id: number;
    category_id: number;
  },
) {
  const result = await client.query<OfficerMappingRow>(
    `
      SELECT
        id,
        zone_id,
        ward_id,
        department_id,
        category_id,
        l1_officer_id,
        l2_officer_id,
        l3_officer_id,
        sla_l1,
        sla_l2,
        sla_l3
      FROM officer_mapping
      WHERE zone_id = $1
        AND ward_id = $2
        AND department_id = $3
        AND category_id = $4
      LIMIT 1
    `,
    [input.zone_id, input.ward_id, input.department_id, input.category_id],
  );

  return result.rows[0] || null;
}

function computeDeadline(days: number) {
  const deadline = new Date();
  deadline.setUTCDate(deadline.getUTCDate() + Math.max(1, days));
  return deadline;
}

function getOfficerHomePath(role: OfficerRole) {
  if (role === 'L1') return '/l1';
  if (role === 'L2') return '/l2';
  if (role === 'L3') return '/l3';
  return '/admin';
}

function getPendingLevelLabel(level: OfficerLevel) {
  return `Pending at ${level}`;
}

export async function getOfficerProfileForUser(user: Pick<User, 'id'>) {
  const result = await query<OfficerRow>(
    `
      SELECT
        o.id,
        o.user_id,
        o.name,
        o.email,
        o.role,
        o.department_id,
        d.name AS department_name,
        o.zone_id,
        z.name AS zone_name,
        o.ward_id,
        w.name AS ward_name,
        o.designation,
        o.created_at,
        o.updated_at
      FROM officers o
      LEFT JOIN departments d ON d.id = o.department_id
      LEFT JOIN zones z ON z.id = o.zone_id
      LEFT JOIN wards w ON w.id = o.ward_id
      WHERE o.user_id = $1
      LIMIT 1
    `,
    [user.id],
  );

  return result.rows[0] ? mapOfficer(result.rows[0]) : null;
}

export async function requireOfficerProfile(user: User) {
  const officer = await getOfficerProfileForUser(user);

  if (!officer) {
    throw new AuthError('This account is not mapped to an officer profile.', 403);
  }

  return officer;
}

export async function assignComplaintToInitialOfficer(
  client: DbTransactionClient,
  complaint: {
    id: string;
    complaint_id: string;
    title: string;
    user_id: string;
    zone_id: number | null;
    ward_id: number;
    department_id: number | null;
    category_id: number | null;
  },
) {
  if (!complaint.zone_id || !complaint.department_id || !complaint.category_id) {
    throw new AuthError('Complaint is missing normalized mapping identifiers for officer routing.', 500);
  }

  const mapping = await getOfficerMapping(client, {
    zone_id: complaint.zone_id,
    ward_id: complaint.ward_id,
    department_id: complaint.department_id,
    category_id: complaint.category_id,
  });

  if (!mapping) {
    throw new AuthError('No officer mapping exists for the selected zone, ward, department, and category.', 400);
  }

  const deadline = computeDeadline(mapping.sla_l1);

  await client.query(
    `
      UPDATE complaints
      SET
        assigned_officer_id = $2,
        current_level = 'L1',
        deadline = $3,
        status = 'assigned',
        progress = 'pending',
        updated_at = NOW(),
        department_message = 'Complaint assigned to the designated Level 1 officer for action and is pending at L1.'
      WHERE id = $1
    `,
    [complaint.id, mapping.l1_officer_id, deadline.toISOString()],
  );

  await appendComplaintHistory(client, {
    complaint_id: complaint.id,
    action: 'assigned',
    to_officer: mapping.l1_officer_id,
    level: 'L1',
  });

  await appendComplaintUpdate(client, {
    complaint_id: complaint.id,
    status: 'assigned',
    note: 'Complaint assigned automatically to the mapped Level 1 officer.',
  });

  const officerUserId = await getOfficerUserId(client, mapping.l1_officer_id);

  if (officerUserId) {
    await createNotificationForUser(client, {
      user_id: officerUserId,
      complaint_id: complaint.id,
        title: 'New complaint assigned',
        message: `${complaint.title} has been assigned to you as the Level 1 officer.`,
        href: '/l1',
      });
    }

  return {
    mapping_id: mapping.id,
    assigned_officer_id: mapping.l1_officer_id,
    current_level: 'L1' as const,
    deadline: deadline.toISOString(),
  };
}

export async function listComplaintsForOfficer(user: User) {
  const officer = await requireOfficerProfile(user);
  const result = await query<ComplaintRoutingRow>(
    `
      SELECT
        c.id,
        c.complaint_id,
        c.tracking_code,
        c.title,
        c.user_id,
        c.zone_id,
        c.ward_id,
        c.department_id,
        c.category_id,
        c.assigned_officer_id,
        c.current_level,
        c.deadline,
        c.status,
        w.name AS ward_name,
        d.name AS department_name,
        cat.name AS category_name
      FROM complaints c
      INNER JOIN wards w ON w.id = c.ward_id
      LEFT JOIN departments d ON d.id = c.department_id
      LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.assigned_officer_id = $1
      ORDER BY c.deadline ASC NULLS LAST, c.created_at DESC
    `,
    [officer.id],
  );

  return result.rows;
}

export async function forwardComplaintToNextOfficer(user: User, complaintId: string) {
  const officer = await requireOfficerProfile(user);

  if (officer.role !== 'L1' && officer.role !== 'L2') {
    throw new AuthError('Only L1 and L2 officers can forward complaints.', 403);
  }

  let result: {
    complaint_id: string;
    next_level: OfficerLevel;
    assigned_officer_id: string;
    deadline: string;
  } | null = null;

  await withTransaction(async (client) => {
    const complaint = await getComplaintRoutingRow(client, complaintId);

    if (!complaint) {
      throw new AuthError('Complaint not found.', 404);
    }

    if (complaint.assigned_officer_id !== officer.id) {
      throw new AuthError('This complaint is not assigned to the current officer.', 403);
    }

    if (complaint.current_level !== officer.role) {
      throw new AuthError('This complaint has already moved beyond your level.', 400);
    }

    if (['resolved', 'closed', 'rejected'].includes(complaint.status)) {
      throw new AuthError('Closed complaints cannot be forwarded.', 400);
    }

    if (!complaint.zone_id || !complaint.department_id || !complaint.category_id) {
      throw new AuthError('Complaint is missing routing metadata required for forwarding.', 400);
    }

    const mapping = await getOfficerMapping(client, {
      zone_id: complaint.zone_id,
      ward_id: complaint.ward_id,
      department_id: complaint.department_id,
      category_id: complaint.category_id,
    });

    if (!mapping) {
      throw new AuthError('No officer mapping exists for this complaint.', 400);
    }

    const nextLevel = officer.role === 'L1' ? 'L2' : 'L3';
    const toOfficerId = officer.role === 'L1' ? mapping.l2_officer_id : mapping.l3_officer_id;
    const nextSlaDays = officer.role === 'L1' ? mapping.sla_l2 : mapping.sla_l3;

    if (!toOfficerId) {
      throw new AuthError(`No ${nextLevel} officer is mapped for this complaint.`, 400);
    }

    if (complaint.assigned_officer_id === toOfficerId) {
      throw new AuthError(`This complaint is already pending at ${nextLevel}.`, 400);
    }

    const deadline = computeDeadline(nextSlaDays);
    const toOfficerName = await getOfficerName(client, toOfficerId);

    await client.query(
      `
        UPDATE complaints
        SET
          assigned_officer_id = $2,
          current_level = $3,
          deadline = $4,
          status = 'assigned',
          progress = 'pending',
          updated_at = NOW(),
          department_message = $5
        WHERE id = $1
      `,
      [
        complaint.id,
        toOfficerId,
        nextLevel,
        deadline.toISOString(),
        `Complaint manually forwarded and is now ${getPendingLevelLabel(nextLevel)}.`,
      ],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'assigned',
      note: `Complaint forwarded from ${officer.role} to ${nextLevel}${toOfficerName ? ` and assigned to ${toOfficerName}` : ''}.`,
      updated_by_user_id: user.id,
    });

    await appendComplaintHistory(client, {
      complaint_id: complaint.id,
      action: 'escalated',
      from_officer: officer.id,
      to_officer: toOfficerId,
      level: nextLevel,
    });

    const officerUserId = await getOfficerUserId(client, toOfficerId);

    if (officerUserId) {
      await createNotificationForUser(client, {
        user_id: officerUserId,
        complaint_id: complaint.id,
        title: `Complaint forwarded to ${nextLevel}`,
        message: `${complaint.title} has been forwarded to your queue and is ${getPendingLevelLabel(nextLevel).toLowerCase()}.`,
        href: getOfficerHomePath(nextLevel),
      });
    }

    await createNotificationForUser(client, {
      user_id: complaint.user_id,
      complaint_id: complaint.id,
      title: 'Complaint moved to next level',
      message: `${complaint.title} has been forwarded to ${nextLevel} for further action.`,
      href: `/citizen/tracker?id=${complaint.complaint_id}`,
    });

    result = {
      complaint_id: complaint.id,
      next_level: nextLevel,
      assigned_officer_id: toOfficerId,
      deadline: deadline.toISOString(),
    };
  });

  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  if (!result) {
    throw new AuthError('Unable to forward complaint right now.', 500);
  }

  return result;
}

async function requireComplaintAssignedToOfficerLevel(
  client: DbTransactionClient,
  input: {
    complaintId: string;
    officerId: string;
    level: OfficerLevel;
  },
) {
  const complaint = await getComplaintRoutingRow(client, input.complaintId);

  if (!complaint) {
    throw new AuthError('Complaint not found.', 404);
  }

  if (complaint.assigned_officer_id !== input.officerId) {
    throw new AuthError('This complaint is not assigned to the current officer.', 403);
  }

  if (complaint.current_level !== input.level) {
    throw new AuthError(`This complaint is not pending at ${input.level}.`, 400);
  }

  return complaint;
}

export async function queueComplaintForL2ReviewAfterCitizenFeedback(
  client: DbTransactionClient,
  input: {
    complaint_id: string;
    complaint_code: string;
    title: string;
    user_id: string;
    zone_id: number | null;
    ward_id: number;
    department_id: number | null;
    category_id: number | null;
    assigned_officer_id: string | null;
    current_level: OfficerLevel | null;
    updated_by_user_id?: string | null;
  },
) {
  if (
    input.current_level !== 'L3' ||
    !input.assigned_officer_id ||
    !input.zone_id ||
    !input.department_id ||
    !input.category_id
  ) {
    return null;
  }

  const mapping = await getOfficerMapping(client, {
    zone_id: input.zone_id,
    ward_id: input.ward_id,
    department_id: input.department_id,
    category_id: input.category_id,
  });

  if (!mapping?.l2_officer_id) {
    return null;
  }

  const deadline = computeDeadline(mapping.sla_l2);
  const toOfficerName = await getOfficerName(client, mapping.l2_officer_id);

  await client.query(
    `
      UPDATE complaints
      SET
        assigned_officer_id = $2,
        current_level = 'L2',
        deadline = $3,
        updated_at = NOW(),
        department_message = 'Citizen feedback received. Complaint is pending Level 2 review for close or reopen decision.'
      WHERE id = $1
    `,
    [input.complaint_id, mapping.l2_officer_id, deadline.toISOString()],
  );

  await appendComplaintUpdate(client, {
    complaint_id: input.complaint_id,
    status: 'resolved',
    note: `Citizen feedback received and the complaint has been routed back to L2${toOfficerName ? ` (${toOfficerName})` : ''} for final review.`,
    updated_by_user_id: input.updated_by_user_id || null,
  });

  const officerUserId = await getOfficerUserId(client, mapping.l2_officer_id);

  if (officerUserId) {
    await createNotificationForUser(client, {
      user_id: officerUserId,
      complaint_id: input.complaint_id,
      title: 'Citizen feedback ready for review',
      message: `${input.title} received citizen feedback and is pending your L2 review.`,
      href: '/l2',
    });
  }

  return {
    assigned_officer_id: mapping.l2_officer_id,
    current_level: 'L2' as const,
    deadline: deadline.toISOString(),
  };
}

export async function markComplaintReachedByL3(user: User, complaintId: string) {
  const officer = await requireOfficerProfile(user);

  if (officer.role !== 'L3') {
    throw new AuthError('Only L3 officers can perform this action.', 403);
  }

  let updatedComplaint: Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'> | null = null;

  await withTransaction(async (client) => {
    const complaint = await requireComplaintAssignedToOfficerLevel(client, {
      complaintId,
      officerId: officer.id,
      level: 'L3',
    });

    if (complaint.status === 'in_progress') {
      throw new AuthError('This complaint has already been marked as reached.', 400);
    }

    if (['resolved', 'closed', 'rejected'].includes(complaint.status)) {
      throw new AuthError('Closed complaints cannot be marked as reached.', 400);
    }

    await client.query(
      `
        UPDATE complaints
        SET
          status = 'in_progress',
          progress = 'in_progress',
          updated_at = NOW(),
          department_message = 'Level 3 officer has reached the complaint location and started final resolution work.'
        WHERE id = $1
      `,
      [complaint.id],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'in_progress',
      note: 'Level 3 officer marked the complaint as reached and started final resolution work.',
      updated_by_user_id: user.id,
    });

    await createNotificationForUser(client, {
      user_id: complaint.user_id,
      complaint_id: complaint.id,
      title: 'L3 officer reached the complaint',
      message: `${complaint.title} is now being handled on site by the assigned Level 3 officer.`,
      href: `/citizen/tracker?id=${complaint.complaint_id}`,
    });

    updatedComplaint = complaint;
  });

  if (!updatedComplaint) {
    throw new AuthError('Unable to mark complaint as reached right now.', 500);
  }

  await invalidateComplaintReadCaches(updatedComplaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  return {
    complaint_id: updatedComplaint.id,
    status: 'in_progress' as const,
  };
}

export async function uploadComplaintProofByL3(
  user: User,
  complaintId: string,
  input: { image: File; description?: string },
) {
  const officer = await requireOfficerProfile(user);

  if (officer.role !== 'L3') {
    throw new AuthError('Only L3 officers can upload complaint proof.', 403);
  }

  if (!input.image || input.image.size <= 0) {
    throw new AuthError('A proof image is required.', 400);
  }

  if (!isLikelyImageUpload(input.image)) {
    throw new AuthError('Only image uploads are allowed for proof submissions.', 400);
  }

  const description = input.description?.trim() || null;
  const hasComplaintProofsTable = await complaintProofsTableExists();

  if (!hasComplaintProofsTable) {
    throw new AuthError('Complaint proof storage is not initialized. Run the latest database setup for complaint_proofs.', 500);
  }

  let updatedComplaint: Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'> | null = null;
  let proofRecord: { id: string; complaint_id: string; image_url: string; description: string | null; created_at: string } | null = null;

  await withTransaction(async (client) => {
    const complaint = await requireComplaintAssignedToOfficerLevel(client, {
      complaintId,
      officerId: officer.id,
      level: 'L3',
    });

    if (['resolved', 'closed', 'rejected'].includes(complaint.status)) {
      throw new AuthError('Closed complaints cannot accept new proof uploads.', 400);
    }

    if (complaint.status !== 'in_progress' && complaint.status !== 'assigned') {
      throw new AuthError('Mark the complaint as reached before uploading proof.', 400);
    }

    if (complaint.status === 'assigned') {
      await client.query(
        `
          UPDATE complaints
          SET
            status = 'in_progress',
            progress = 'in_progress',
            updated_at = NOW(),
            department_message = 'Level 3 officer has reached the complaint location and started final resolution work.'
          WHERE id = $1
        `,
        [complaint.id],
      );

      await appendComplaintUpdate(client, {
        complaint_id: complaint.id,
        status: 'in_progress',
        note: 'Level 3 officer started work while uploading resolution proof.',
        updated_by_user_id: user.id,
      });
    }

    const proofImage = await saveProofImage(input.image, complaint.id);
    const proofInsert = await client.query<{
      id: string;
      complaint_id: string;
      image_url: string;
      description: string | null;
      created_at: string;
    }>(
      `
        INSERT INTO complaint_proofs (complaint_id, image_url, description)
        VALUES ($1, $2, $3)
        RETURNING id, complaint_id, image_url, description, created_at
      `,
      [complaint.id, proofImage.url, description],
    );

    await client.query(
      `
        UPDATE complaints
        SET
          proof_image = $2::jsonb,
          proof_text = COALESCE($3, proof_text),
          updated_at = NOW(),
          department_message = 'Resolution proof uploaded by the Level 3 officer. Final resolution is pending.'
        WHERE id = $1
      `,
      [complaint.id, JSON.stringify(proofImage), description],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'in_progress',
      note: description
        ? `Level 3 officer uploaded resolution proof: ${description}`
        : 'Level 3 officer uploaded resolution proof.',
      updated_by_user_id: user.id,
    });

    updatedComplaint = complaint;
    proofRecord = proofInsert.rows[0] || null;
  });

  if (!updatedComplaint || !proofRecord) {
    throw new AuthError('Unable to upload proof right now.', 500);
  }

  await invalidateComplaintReadCaches(updatedComplaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  return proofRecord;
}

export async function markComplaintResolvedByL3(user: User, complaintId: string, note?: string) {
  const officer = await requireOfficerProfile(user);

  if (officer.role !== 'L3') {
    throw new AuthError('Only L3 officers can mark complaints as resolved.', 403);
  }

  const trimmedNote = note?.trim() || null;
  const hasComplaintProofsTable = await complaintProofsTableExists();
  let updatedComplaint: Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'> | null = null;

  await withTransaction(async (client) => {
    const complaint = await requireComplaintAssignedToOfficerLevel(client, {
      complaintId,
      officerId: officer.id,
      level: 'L3',
    });

    if (complaint.status === 'resolved') {
      throw new AuthError('This complaint has already been resolved.', 400);
    }

    if (['closed', 'rejected'].includes(complaint.status)) {
      throw new AuthError('Closed complaints cannot be resolved again.', 400);
    }

    if (complaint.status !== 'in_progress') {
      throw new AuthError('Mark the complaint as reached before resolving it.', 400);
    }

    if (!hasComplaintProofsTable) {
      throw new AuthError('Complaint proof storage is not initialized. Run the latest database setup for complaint_proofs.', 500);
    }

    const proofCountResult = await client.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM complaint_proofs
        WHERE complaint_id = $1
      `,
      [complaint.id],
    );

    if (Number(proofCountResult.rows[0]?.count || 0) <= 0) {
      throw new AuthError('Upload at least one proof image before resolving the complaint.', 400);
    }

    await client.query(
      `
        UPDATE complaints
        SET
          status = 'resolved',
          progress = 'resolved',
          resolved_at = NOW(),
          resolution_notes = COALESCE($2, proof_text, resolution_notes),
          updated_at = NOW(),
          department_message = 'Complaint resolved by the Level 3 officer.'
        WHERE id = $1
      `,
      [complaint.id, trimmedNote],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'resolved',
      note: trimmedNote || 'Complaint resolved by the Level 3 officer after proof upload.',
      updated_by_user_id: user.id,
    });

    await appendComplaintHistory(client, {
      complaint_id: complaint.id,
      action: 'resolved',
      from_officer: officer.id,
      to_officer: officer.id,
      level: 'L3',
    });

    await createNotificationForUser(client, {
      user_id: complaint.user_id,
      complaint_id: complaint.id,
      title: 'Complaint resolved',
      message: `${complaint.title} has been marked resolved by the assigned Level 3 officer.`,
      href: `/citizen/tracker?id=${complaint.complaint_id}`,
    });

    const adminIds = await listAdminUserIds(client);

    for (const adminId of adminIds) {
      await createNotificationForUser(client, {
        user_id: adminId,
        complaint_id: complaint.id,
        title: 'Complaint resolved',
        message: `${complaint.title} has been resolved at L3 with uploaded proof.`,
        href: '/admin/complaints',
      });
    }

    updatedComplaint = complaint;
  });

  if (!updatedComplaint) {
    throw new AuthError('Unable to resolve complaint right now.', 500);
  }

  await invalidateComplaintReadCaches(updatedComplaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  return {
    complaint_id: updatedComplaint.id,
    status: 'resolved' as const,
  };
}

export async function closeComplaintByL2Review(user: User, complaintId: string, note?: string) {
  const officer = await requireOfficerProfile(user);

  if (officer.role !== 'L2') {
    throw new AuthError('Only L2 officers can close reviewed complaints.', 403);
  }

  let updatedComplaint: Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'> | null = null;
  const trimmedNote = note?.trim() || null;

  await withTransaction(async (client) => {
    const complaint = await requireComplaintAssignedToOfficerLevel(client, {
      complaintId,
      officerId: officer.id,
      level: 'L2',
    });

    if (complaint.status !== 'resolved') {
      throw new AuthError('Only resolved complaints can be closed after review.', 400);
    }

    const ratingResult = await client.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM ratings
        WHERE complaint_id = $1
      `,
      [complaint.id],
    );

    if (Number(ratingResult.rows[0]?.count || 0) <= 0) {
      throw new AuthError('Citizen feedback is required before L2 can close the complaint.', 400);
    }

    await client.query(
      `
        UPDATE complaints
        SET
          status = 'closed',
          progress = 'resolved',
          updated_at = NOW(),
          department_message = $2
        WHERE id = $1
      `,
      [
        complaint.id,
        trimmedNote
          ? `Complaint closed by Level 2 after citizen feedback review. ${trimmedNote}`
          : 'Complaint closed by Level 2 after citizen feedback review.',
      ],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'closed',
      note: trimmedNote || 'Complaint closed by Level 2 after citizen feedback review.',
      updated_by_user_id: user.id,
    });

    await createNotificationForUser(client, {
      user_id: complaint.user_id,
      complaint_id: complaint.id,
      title: 'Complaint closed',
      message: `${complaint.title} has been closed after Level 2 review of your feedback.`,
      href: `/citizen/tracker?id=${complaint.complaint_id}`,
    });

    updatedComplaint = complaint;
  });

  if (!updatedComplaint) {
    throw new AuthError('Unable to close complaint right now.', 500);
  }

  await invalidateComplaintReadCaches(updatedComplaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  return {
    complaint_id: updatedComplaint.id,
    status: 'closed' as const,
  };
}

export async function reopenComplaintFromL2Review(user: User, complaintId: string, note?: string) {
  const officer = await requireOfficerProfile(user);

  if (officer.role !== 'L2') {
    throw new AuthError('Only L2 officers can reopen reviewed complaints.', 403);
  }

  let updatedComplaint: Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'> | null = null;
  const trimmedNote = note?.trim() || null;
  const hasProofImagesColumn = await complaintsTableHasProofImagesColumn();
  const hasComplaintProofsTable = await complaintProofsTableExists();

  await withTransaction(async (client) => {
    const complaint = await requireComplaintAssignedToOfficerLevel(client, {
      complaintId,
      officerId: officer.id,
      level: 'L2',
    });

    if (complaint.status !== 'resolved' && complaint.status !== 'closed') {
      throw new AuthError('Only resolved or closed complaints can be reopened.', 400);
    }

    if (!complaint.zone_id || !complaint.department_id || !complaint.category_id) {
      throw new AuthError('Complaint is missing routing metadata required for reopening.', 400);
    }

    const mapping = await getOfficerMapping(client, {
      zone_id: complaint.zone_id,
      ward_id: complaint.ward_id,
      department_id: complaint.department_id,
      category_id: complaint.category_id,
    });

    if (!mapping?.l3_officer_id) {
      throw new AuthError('No L3 officer is mapped for this complaint.', 400);
    }

    const deadline = computeDeadline(mapping.sla_l3);
    const l3OfficerName = await getOfficerName(client, mapping.l3_officer_id);

    if (hasComplaintProofsTable) {
      await client.query(
        `
          DELETE FROM complaint_proofs
          WHERE complaint_id = $1
        `,
        [complaint.id],
      );
    }

    await client.query(
      `
        DELETE FROM ratings
        WHERE complaint_id = $1
      `,
      [complaint.id],
    );

    await client.query(
      `
        UPDATE complaints
        SET
          assigned_officer_id = $2,
          current_level = 'L3',
          status = 'assigned',
          progress = 'pending',
          deadline = $3,
          proof_image = NULL,
          ${hasProofImagesColumn ? 'proof_images = NULL,' : ''}
          proof_text = NULL,
          resolved_at = NULL,
          resolution_notes = NULL,
          updated_at = NOW(),
          department_message = $4
        WHERE id = $1
      `,
      [
        complaint.id,
        mapping.l3_officer_id,
        deadline.toISOString(),
        trimmedNote
          ? `Complaint reopened by Level 2 after citizen feedback. Rework is required at Level 3. ${trimmedNote}`
          : 'Complaint reopened by Level 2 after citizen feedback. Rework is required at Level 3.',
      ],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'assigned',
      note: trimmedNote || 'Complaint reopened by Level 2 and returned to L3 for rework.',
      updated_by_user_id: user.id,
    });

    await appendComplaintHistory(client, {
      complaint_id: complaint.id,
      action: 'escalated',
      from_officer: officer.id,
      to_officer: mapping.l3_officer_id,
      level: 'L3',
    });

    const l3OfficerUserId = await getOfficerUserId(client, mapping.l3_officer_id);

    if (l3OfficerUserId) {
      await createNotificationForUser(client, {
        user_id: l3OfficerUserId,
        complaint_id: complaint.id,
        title: 'Complaint reopened for rework',
        message: `${complaint.title} has been reopened by L2 and returned to your L3 queue${l3OfficerName ? ` (${l3OfficerName})` : ''}.`,
        href: '/l3',
      });
    }

    await createNotificationForUser(client, {
      user_id: complaint.user_id,
      complaint_id: complaint.id,
      title: 'Complaint reopened',
      message: `${complaint.title} has been reopened after your feedback and sent back for fresh L3 action.`,
      href: `/citizen/tracker?id=${complaint.complaint_id}`,
    });

    updatedComplaint = complaint;
  });

  if (!updatedComplaint) {
    throw new AuthError('Unable to reopen complaint right now.', 500);
  }

  await invalidateComplaintReadCaches(updatedComplaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  return {
    complaint_id: updatedComplaint.id,
    status: 'assigned' as const,
    current_level: 'L3' as const,
  };
}

export async function resolveComplaintForOfficer(user: User, complaintId: string, note?: string) {
  return markComplaintResolvedByL3(user, complaintId, note);
}
