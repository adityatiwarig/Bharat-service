import { Buffer } from 'node:buffer';

import type { NextApiRequest, NextApiResponse } from 'next';

import { buildComplaintSiteAddress, resolveGrievanceSelection } from '@/lib/grievance-mapping';
import { getOfficerDashboardSummary, getWorkerDashboardSummary } from '@/lib/server/dashboard';
import {
  createComplaintForUser,
  getComplaintByIdForUser,
  updateComplaintStatusForUser,
} from '@/lib/server/complaints';
import {
  AuthError,
  getUserByEmail,
  getUserByPhone,
  normalizeCitizenPhone,
  signupCitizen,
} from '@/lib/server/auth';
import { getLiveGrievanceMappingResponse } from '@/lib/server/grievance-mapping';
import {
  closeComplaintByL2Review,
  completeComplaintByL1,
  forwardComplaintToNextOfficer,
  markComplaintOnSiteByL1,
  markComplaintViewedByL1,
  markComplaintWorkStartedByL1,
  remindL1OfficerFromL2,
  remindL1OfficerFromL3,
  remindL2OfficerFromL3,
  reopenComplaintFromL2Review,
  uploadComplaintProofByL1,
} from '@/lib/server/officer-routing';
import type { Complaint, GrievanceMappingResponse, User } from '@/lib/types';

type TwilioMode = 'CITIZEN' | 'WORKER' | 'L1' | 'L2' | 'L3';
type TwilioPayload = Record<string, string>;

type SignupStep = 'name' | 'email' | 'password' | 'confirm_password';
type CitizenDraftStep =
  | 'applicant_name'
  | 'applicant_gender'
  | 'applicant_address'
  | 'department_id'
  | 'category_id'
  | 'title'
  | 'text'
  | 'zone_id'
  | 'ward_id'
  | 'street_address'
  | 'previous_complaint_id'
  | 'attachments';

type SignupDraft = {
  step: SignupStep;
  data: {
    name: string;
    email: string;
    password: string;
  };
};

type CitizenDraftData = {
  applicant_name: string;
  applicant_gender: string;
  applicant_address: string;
  department_id: number | null;
  category_id: number | null;
  title: string;
  text: string;
  zone_id: number | null;
  ward_id: number | null;
  street_address: string;
  previous_complaint_id: string;
};

type CitizenDraft = {
  step: CitizenDraftStep;
  data: CitizenDraftData;
};

type SessionState = {
  role?: TwilioMode;
  signupDraft?: SignupDraft;
  citizenDraft?: CitizenDraft;
  updatedAt: number;
};

export const config = {
  api: {
    bodyParser: true,
  },
};

const SESSION_TTL_MS = 1000 * 60 * 30;
const MAX_COMPLAINT_ATTACHMENTS = 6;
const MAX_PROOF_ATTACHMENTS = 6;
const SIGNUP_MENU = 'You are not registered.\n\n1. SIGNUP\n2. EXIT';
// In-memory WhatsApp session state is keyed by normalized phone number.
const sessions = new Map<string, SessionState>();

function cleanupExpiredSessions() {
  const now = Date.now();

  for (const [phone, session] of sessions.entries()) {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(phone);
    }
  }
}

function getSession(phone: string) {
  cleanupExpiredSessions();
  const existing = sessions.get(phone);

  if (existing) {
    existing.updatedAt = Date.now();
    return existing;
  }

  const created: SessionState = { updatedAt: Date.now() };
  sessions.set(phone, created);
  return created;
}

function createSignupDraft(): SignupDraft {
  return {
    step: 'name',
    data: {
      name: '',
      email: '',
      password: '',
    },
  };
}

function createCitizenDraft(): CitizenDraft {
  return {
    step: 'applicant_name',
    data: {
      applicant_name: '',
      applicant_gender: '',
      applicant_address: '',
      department_id: null,
      category_id: null,
      title: '',
      text: '',
      zone_id: null,
      ward_id: null,
      street_address: '',
      previous_complaint_id: '',
    },
  };
}

function resetSignupDraft(session: SessionState) {
  delete session.signupDraft;
}

function resetCitizenDraft(session: SessionState) {
  delete session.citizenDraft;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildTwimlMessage(message: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
}

function sendTwiml(res: NextApiResponse, message: string, status = 200) {
  res.status(status);
  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.send(buildTwimlMessage(message));
}

function parsePayload(body: NextApiRequest['body']): TwilioPayload {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return Object.fromEntries(
      Object.entries(body as Record<string, unknown>).map(([key, value]) => [
        key,
        Array.isArray(value) ? String(value[0] ?? '') : String(value ?? ''),
      ]),
    );
  }

  if (typeof body === 'string') {
    return Object.fromEntries(new URLSearchParams(body).entries());
  }

  return {};
}

function normalizeWhatsappPhone(from: string) {
  const rawPhone = from.replace(/^whatsapp:/i, '').trim();
  return normalizeCitizenPhone(rawPhone) || '';
}

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function isSkipValue(value: string) {
  const normalized = value.trim().toUpperCase();
  return normalized === 'SKIP' || normalized === 'NA' || normalized === 'NONE';
}

function isDefaultValue(value: string) {
  return value.trim().toUpperCase() === 'DEFAULT';
}

function isGreeting(value: string) {
  return ['HI', 'HELLO', 'HELP', 'MENU'].includes(value.trim().toUpperCase());
}

function formatStatusLabel(value?: string | null) {
  return String(value || 'unknown')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'NA';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

function formatComplaintSummary(complaint: Complaint) {
  const lines = [
    `Complaint ID: ${complaint.complaint_id}`,
    `Status: ${formatStatusLabel(complaint.status)}`,
  ];

  if (complaint.current_level) {
    lines.push(`Level: ${formatStatusLabel(complaint.current_level)}`);
  }

  if (complaint.work_status) {
    lines.push(`Work Status: ${complaint.work_status}`);
  }

  if (complaint.assigned_officer_name) {
    lines.push(`Officer: ${complaint.assigned_officer_name}`);
  }

  if (complaint.ward_name) {
    lines.push(`Ward: ${complaint.ward_name}`);
  }

  if (complaint.department_name || complaint.department) {
    lines.push(`Department: ${complaint.department_name || formatStatusLabel(complaint.department)}`);
  }

  if (complaint.deadline) {
    lines.push(`Deadline: ${formatDateTime(complaint.deadline)}`);
  }

  if (complaint.department_message) {
    lines.push(`Update: ${complaint.department_message}`);
  }

  lines.push(`Last Updated: ${formatDateTime(complaint.updated_at)}`);
  return lines.join('\n');
}

function formatComplaintQueue(items: Complaint[], emptyMessage: string) {
  if (!items.length) {
    return emptyMessage;
  }

  return items
    .map((complaint, index) => `${index + 1}. ${complaint.complaint_id} | ${formatStatusLabel(complaint.status)} | ${complaint.title}`)
    .join('\n');
}

function formatRoleMenu(allowedModes: TwilioMode[]) {
  if (allowedModes.length === 1) {
    return getRoleHelpMessage(allowedModes[0]);
  }

  return [
    'Select your mode first.',
    allowedModes.map((mode, index) => `${index + 1}. ${mode}`).join('\n'),
    'Reply with the number or mode name.',
  ].join('\n');
}

function findNamedOption<T extends { id: number; name: string }>(input: string, options: T[]) {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  const numericId = Number(trimmed);

  if (Number.isInteger(numericId)) {
    const byId = options.find((option) => option.id === numericId);

    if (byId) {
      return byId;
    }
  }

  const normalizedInput = normalizeLookupValue(trimmed);
  const exact = options.find((option) => normalizeLookupValue(option.name) === normalizedInput);

  if (exact) {
    return exact;
  }

  const partialMatches = options.filter((option) => normalizeLookupValue(option.name).includes(normalizedInput));
  return partialMatches.length === 1 ? partialMatches[0] : null;
}

function findIndexedOption<T extends { id: number; name: string }>(input: string, options: T[]) {
  const trimmed = input.trim();
  const numericSelection = Number(trimmed);

  if (Number.isInteger(numericSelection) && numericSelection >= 1 && numericSelection <= options.length) {
    return options[numericSelection - 1];
  }

  return findNamedOption(trimmed, options);
}

function formatNumberedOptions<T extends { name: string }>(label: string, options: T[]) {
  return `${label}:\n${options.map((option, index) => `${index + 1}. ${option.name}`).join('\n')}`;
}

function resolveGenderSelection(value: string) {
  const normalized = value.trim().toUpperCase();

  if (normalized === '1' || normalized === 'MALE') return 'male';
  if (normalized === '2' || normalized === 'FEMALE') return 'female';
  if (normalized === '3' || normalized === 'OTHER') return 'other';
  if (normalized === '4' || isSkipValue(value)) return '';
  return null;
}

function getAllowedModes(user: User): TwilioMode[] {
  const modes: TwilioMode[] = [];

  if (user.role === 'citizen') {
    modes.push('CITIZEN');
  }

  if (user.role === 'worker') {
    modes.push('WORKER');
  }

  if (user.officer_role === 'L1') {
    modes.push('L1');
  }

  if (user.officer_role === 'L2') {
    modes.push('L2');
  }

  if (user.officer_role === 'L3') {
    modes.push('L3');
  }

  return modes;
}

function resolveRequestedMode(input: string, allowedModes: TwilioMode[]) {
  const normalized = input.trim().toUpperCase();

  if (!normalized) {
    return null;
  }

  const numericSelection = Number(normalized);

  if (Number.isInteger(numericSelection) && numericSelection >= 1 && numericSelection <= allowedModes.length) {
    return allowedModes[numericSelection - 1];
  }

  return allowedModes.find((mode) => mode === normalized) || null;
}

function getRoleHelpMessage(role: TwilioMode) {
  if (role === 'CITIZEN') {
    return [
      'Citizen commands:',
      'COMPLAINT',
      'TRACK <ID>',
      'MENU',
      'CANCEL',
      'Send CITIZEN, WORKER, L1, L2, or L3 anytime to switch role.',
    ].join('\n');
  }

  if (role === 'WORKER') {
    return [
      'Worker commands:',
      'MYTASKS',
      'TRACK <ID>',
      'INPROGRESS <ID>',
      'RESOLVED <ID> <proof note> with image attached',
    ].join('\n');
  }

  if (role === 'L1') {
    return [
      'L1 commands:',
      'MYTASKS',
      'TRACK <ID>',
      'VIEWED <ID>',
      'ONSITE <ID>',
      'START <ID>',
      'PROOF <ID> <note> with image attached',
      'COMPLETE <ID> [note]',
      'ESCALATE <ID>',
    ].join('\n');
  }

  if (role === 'L2') {
    return [
      'L2 commands:',
      'MYTASKS',
      'TRACK <ID>',
      'REMINDL1 <ID> [note]',
      'CLOSE <ID> [note]',
      'REOPEN <ID> [note]',
    ].join('\n');
  }

  return [
    'L3 commands:',
    'MYTASKS',
    'TRACK <ID>',
    'REMINDL1 <ID> [note]',
    'REMINDL2 <ID> [note]',
    'CLOSE <ID> [note]',
    'REOPEN <ID> [note]',
  ].join('\n');
}

function getSignupPrompt(step: SignupStep) {
  switch (step) {
    case 'name':
      return 'Signup Step 1 of 4\nEnter your full name.';
    case 'email':
      return 'Signup Step 2 of 4\nEnter your email address.';
    case 'password':
      return 'Signup Step 3 of 4\nCreate your password.';
    case 'confirm_password':
      return 'Signup Step 4 of 4\nConfirm your password.';
    default:
      return SIGNUP_MENU;
  }
}

function getDraftPrompt(step: CitizenDraftStep, user: User, mapping?: GrievanceMappingResponse, draft?: CitizenDraft) {
  switch (step) {
    case 'applicant_name':
      return `Full name for this complaint?\nReply with DEFAULT to use: ${user.name}`;
    case 'applicant_gender':
      return 'Gender:\n1. Male\n2. Female\n3. Other\n4. Skip';
    case 'applicant_address':
      return 'Enter your residential address.';
    case 'department_id':
      return mapping ? `${formatNumberedOptions('Departments', mapping.departments)}\nReply with the number.` : 'Department?';
    case 'category_id': {
      const departmentId = draft?.data.department_id;
      const categories = mapping?.categories.filter((category) => category.department_id === departmentId) || [];
      return categories.length
        ? `${formatNumberedOptions('Categories', categories)}\nReply with the number.`
        : 'No categories are available for this department. Reply with another department.';
    }
    case 'title':
      return 'Enter the complaint subject.';
    case 'text':
      return 'Enter the complaint description.';
    case 'zone_id':
      return mapping ? `${formatNumberedOptions('Zones', mapping.zones)}\nReply with the number.` : 'Zone?';
    case 'ward_id': {
      const zoneId = draft?.data.zone_id;
      const wards = mapping?.wards.filter((ward) => ward.zone_id === zoneId) || [];
      return wards.length
        ? `${formatNumberedOptions('Wards', wards)}\nReply with the number.`
        : 'No wards are available for this zone. Reply with another zone.';
    }
    case 'street_address':
      return 'Street or landmark? Reply with text or SKIP.';
    case 'previous_complaint_id':
      return 'Previous complaint ID? Reply with text or SKIP.';
    case 'attachments':
      return 'Send at least one complaint image now. You can attach up to 6 images in one message.';
    default:
      return 'Reply with the requested value.';
  }
}

function getCommandParts(message: string) {
  const trimmed = message.trim();
  const tokens = trimmed.split(/\s+/);

  return {
    command: (tokens[0] || '').toUpperCase(),
    complaintId: tokens[1] || '',
    note: tokens.slice(2).join(' ').trim(),
  };
}

async function getMapping() {
  return getLiveGrievanceMappingResponse();
}

async function collectInboundImages(payload: TwilioPayload, maxFiles: number) {
  const count = Math.min(Number(payload.NumMedia || 0), maxFiles);
  const files: File[] = [];

  for (let index = 0; index < count; index += 1) {
    const mediaUrl = payload[`MediaUrl${index}`];
    const mediaType = payload[`MediaContentType${index}`] || 'application/octet-stream';

    if (!mediaUrl || !mediaType.startsWith('image/')) {
      continue;
    }

    const headers: Record<string, string> = {};
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      headers.Authorization = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;
    }

    const response = await fetch(mediaUrl, {
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Unable to download the WhatsApp image from Twilio.');
    }

    const extension = mediaType.split('/')[1] || 'jpg';
    const fileBuffer = await response.arrayBuffer();
    files.push(new File([fileBuffer], `twilio-upload-${index + 1}.${extension}`, { type: mediaType }));
  }

  return files;
}

async function handleUnauthenticatedUser(phone: string, session: SessionState, body: string) {
  const normalizedBody = body.trim().toUpperCase();

  if (session.signupDraft) {
    return handleSignupInput(phone, session, body);
  }

  if (normalizedBody === '2' || normalizedBody === 'EXIT') {
    sessions.delete(phone);
    return 'Session closed. Message again whenever you want to register.';
  }

  if (normalizedBody === '1' || normalizedBody === 'SIGNUP') {
    session.signupDraft = createSignupDraft();
    return getSignupPrompt(session.signupDraft.step);
  }

  return SIGNUP_MENU;
}

// Signup stays phone-based and reuses the existing citizen signup service.
async function handleSignupInput(phone: string, session: SessionState, body: string) {
  const draft = session.signupDraft;

  if (!draft) {
    return SIGNUP_MENU;
  }

  const text = body.trim();

  switch (draft.step) {
    case 'name': {
      if (!text) {
        return getSignupPrompt(draft.step);
      }

      draft.data.name = text;
      draft.step = 'email';
      return getSignupPrompt(draft.step);
    }
    case 'email': {
      const email = text.toLowerCase();

      if (!email || !email.includes('@')) {
        return 'Enter a valid email address.';
      }

      const existingEmailUser = await getUserByEmail(email);

      if (existingEmailUser) {
        resetSignupDraft(session);
        return 'User already exists, please login via website.';
      }

      draft.data.email = email;
      draft.step = 'password';
      return getSignupPrompt(draft.step);
    }
    case 'password': {
      if (!text) {
        return 'Password cannot be empty.';
      }

      draft.data.password = text;
      draft.step = 'confirm_password';
      return getSignupPrompt(draft.step);
    }
    case 'confirm_password': {
      if (draft.data.password !== text) {
        draft.data.password = '';
        draft.step = 'password';
        return 'Passwords do not match.\nEnter your password again.';
      }

      const existingPhoneUser = await getUserByPhone(phone);

      if (existingPhoneUser) {
        resetSignupDraft(session);
        session.role = 'CITIZEN';
        return `This phone number is already registered.\n${getRoleHelpMessage('CITIZEN')}`;
      }

      const user = await signupCitizen({
        name: draft.data.name,
        email: draft.data.email,
        password: draft.data.password,
        phone,
      });

      resetSignupDraft(session);
      session.role = 'CITIZEN';
      return [
        'Account created successfully.',
        `Welcome ${user.name}.`,
        'Your WhatsApp access is active now.',
        getRoleHelpMessage('CITIZEN'),
      ].join('\n');
    }
    default:
      resetSignupDraft(session);
      return SIGNUP_MENU;
  }
}

// Citizen complaint intake mirrors the website fields and submits through the shared complaint service.
async function handleCitizenDraftInput(
  user: User,
  phone: string,
  session: SessionState,
  body: string,
  payload: TwilioPayload,
) {
  const draft = session.citizenDraft;

  if (!draft) {
    return 'Send COMPLAINT to start a new complaint.';
  }

  const text = body.trim();
  const normalizedText = text.toUpperCase();
  const needsMapping = draft.step === 'department_id' || draft.step === 'category_id' || draft.step === 'zone_id' || draft.step === 'ward_id';
  const mapping = needsMapping ? await getMapping() : null;
  if (isGreeting(normalizedText)) {
    return getDraftPrompt(draft.step, user, mapping || undefined, draft);
  }

  switch (draft.step) {
    case 'applicant_name': {
      draft.data.applicant_name = isDefaultValue(text) && user.name ? user.name : text;

      if (!draft.data.applicant_name.trim()) {
        return getDraftPrompt(draft.step, user, undefined, draft);
      }

      draft.step = 'applicant_gender';
      return `Registered phone: ${user.phone || phone}\nRegistered email: ${user.email}\n${getDraftPrompt(draft.step, user, undefined, draft)}`;
    }
    case 'applicant_gender': {
      const gender = resolveGenderSelection(text);

      if (gender === null) {
        return 'Reply with 1, 2, 3, or 4 for gender.';
      }

      draft.data.applicant_gender = gender;
      draft.step = 'applicant_address';
      return getDraftPrompt(draft.step, user, undefined, draft);
    }
    case 'applicant_address': {
      draft.data.applicant_address = text;

      if (!draft.data.applicant_address.trim()) {
        return getDraftPrompt(draft.step, user, undefined, draft);
      }

      draft.step = 'department_id';
      return getDraftPrompt(draft.step, user, mapping || await getMapping(), draft);
    }
    case 'department_id': {
      const liveMapping = mapping || await getMapping();
      const department = findIndexedOption(text, liveMapping.departments);

      if (!department) {
        return `${formatNumberedOptions('Invalid department. Choose one of these', liveMapping.departments)}\nReply with the number.`;
      }

      draft.data.department_id = department.id;
      draft.data.category_id = null;
      draft.step = 'category_id';
      return getDraftPrompt(draft.step, user, liveMapping, draft);
    }
    case 'category_id': {
      const liveMapping = mapping || await getMapping();
      const categories = liveMapping.categories.filter((category) => category.department_id === draft.data.department_id);
      const category = findIndexedOption(text, categories);

      if (!category) {
        return `${formatNumberedOptions('Invalid category. Choose one of these', categories)}\nReply with the number.`;
      }

      draft.data.category_id = category.id;
      draft.step = 'title';
      return getDraftPrompt(draft.step, user, undefined, draft);
    }
    case 'title': {
      draft.data.title = text;

      if (!draft.data.title.trim()) {
        return getDraftPrompt(draft.step, user, undefined, draft);
      }

      draft.step = 'text';
      return getDraftPrompt(draft.step, user, undefined, draft);
    }
    case 'text': {
      draft.data.text = text;

      if (!draft.data.text.trim()) {
        return getDraftPrompt(draft.step, user, undefined, draft);
      }

      draft.step = 'zone_id';
      return getDraftPrompt(draft.step, user, mapping || await getMapping(), draft);
    }
    case 'zone_id': {
      const liveMapping = mapping || await getMapping();
      const zone = findIndexedOption(text, liveMapping.zones);

      if (!zone) {
        return `${formatNumberedOptions('Invalid zone. Choose one of these', liveMapping.zones)}\nReply with the number.`;
      }

      draft.data.zone_id = zone.id;
      draft.data.ward_id = null;
      draft.step = 'ward_id';
      return getDraftPrompt(draft.step, user, liveMapping, draft);
    }
    case 'ward_id': {
      const liveMapping = mapping || await getMapping();
      const wards = liveMapping.wards.filter((ward) => ward.zone_id === draft.data.zone_id);
      const ward = findIndexedOption(text, wards);

      if (!ward) {
        return `${formatNumberedOptions('Invalid ward. Choose one of these', wards)}\nReply with the number.`;
      }

      draft.data.ward_id = ward.id;
      draft.step = 'street_address';
      return getDraftPrompt(draft.step, user, undefined, draft);
    }
    case 'street_address': {
      draft.data.street_address = isSkipValue(text) ? '' : text;
      draft.step = 'previous_complaint_id';
      return getDraftPrompt(draft.step, user, undefined, draft);
    }
    case 'previous_complaint_id': {
      draft.data.previous_complaint_id = isSkipValue(text) ? '' : text;
      draft.step = 'attachments';
      return getDraftPrompt(draft.step, user, undefined, draft);
    }
    case 'attachments': {
      const files = await collectInboundImages(payload, MAX_COMPLAINT_ATTACHMENTS);

      if (!files.length) {
        return 'At least one complaint image is required. Attach the image and send again.\n\nSend at least one complaint image now. You can attach up to 6 images in one message.';
      }

      const selection = resolveGrievanceSelection({
        zone_id: draft.data.zone_id || 0,
        ward_id: draft.data.ward_id || 0,
        department_id: draft.data.department_id || 0,
        category_id: draft.data.category_id || 0,
      });

      if (!selection) {
        throw new AuthError('The selected zone, ward, department, and category combination is invalid.', 400);
      }

      const complaint = await createComplaintForUser(
        user,
        {
          applicant_name: draft.data.applicant_name.trim(),
          applicant_mobile: user.phone || phone,
          applicant_email: user.email || '',
          applicant_address: draft.data.applicant_address.trim(),
          applicant_gender: draft.data.applicant_gender || undefined,
          previous_complaint_id: draft.data.previous_complaint_id.trim() || undefined,
          zone_id: draft.data.zone_id || undefined,
          title: draft.data.title.trim(),
          text: draft.data.text.trim(),
          category: selection.legacy_category,
          category_id: draft.data.category_id || undefined,
          department: selection.legacy_department,
          department_id: draft.data.department_id || undefined,
          ward_id: draft.data.ward_id || 0,
          street_address: draft.data.street_address.trim() || undefined,
          location_address: buildComplaintSiteAddress({
            zoneName: selection.zone.name,
            wardName: selection.ward.name,
            streetAddress: draft.data.street_address.trim() || undefined,
          }),
        },
        files,
      );

      resetCitizenDraft(session);
      return [
        'Complaint registered successfully.',
        `ID: ${complaint.complaint_id}`,
        `Status: ${formatStatusLabel(complaint.status)}`,
        `Track: TRACK ${complaint.complaint_id}`,
      ].join('\n');
    }
    default:
      return 'Send COMPLAINT to start a new complaint.';
  }
}

async function handleTrackCommand(user: User, complaintId: string) {
  if (!complaintId.trim()) {
    return 'Use TRACK <Complaint ID>.';
  }

  const complaint = await getComplaintByIdForUser(user, complaintId.trim(), { view: 'full' });

  if (!complaint) {
    return 'Complaint not found.';
  }

  return formatComplaintSummary(complaint);
}

// Worker actions reuse the same execution status transition service used by the web app.
async function handleWorkerCommands(user: User, body: string, payload: TwilioPayload) {
  const { command, complaintId, note } = getCommandParts(body);

  if (command === 'MYTASKS') {
    const summary = await getWorkerDashboardSummary(user);
    return formatComplaintQueue(summary.items, 'No worker tasks are assigned right now.');
  }

  if (command === 'TRACK') {
    return handleTrackCommand(user, complaintId);
  }

  if (command === 'INPROGRESS') {
    if (!complaintId) {
      return 'Use INPROGRESS <Complaint ID>.';
    }

    const complaint = await updateComplaintStatusForUser(user, complaintId, {
      status: 'in_progress',
      note: note || undefined,
    });

    return complaint ? `Updated to In Progress.\n${formatComplaintSummary(complaint)}` : 'Complaint updated.';
  }

  if (command === 'RESOLVED') {
    if (!complaintId) {
      return 'Use RESOLVED <Complaint ID> <proof note> and attach proof image.';
    }

    if (!note) {
      return 'Add a proof note after the complaint ID.';
    }

    const proofImages = await collectInboundImages(payload, MAX_PROOF_ATTACHMENTS);

    if (!proofImages.length) {
      return 'Attach at least one proof image with the RESOLVED message.';
    }

    const complaint = await updateComplaintStatusForUser(user, complaintId, {
      status: 'resolved',
      note,
      proof_text: note,
      proof_images: proofImages,
    });

    return complaint ? `Marked resolved.\n${formatComplaintSummary(complaint)}` : 'Complaint resolved.';
  }

  return getRoleHelpMessage('WORKER');
}

async function handleOfficerQueue(user: User) {
  const summary = await getOfficerDashboardSummary(user);
  return formatComplaintQueue(summary.items, 'No complaints are pending in your queue right now.');
}

// Officer actions stay aligned with the existing routing and review workflows.
async function handleL1Commands(user: User, body: string, payload: TwilioPayload) {
  const { command, complaintId, note } = getCommandParts(body);

  if (command === 'MYTASKS') {
    return handleOfficerQueue(user);
  }

  if (command === 'TRACK') {
    return handleTrackCommand(user, complaintId);
  }

  if (command === 'ASSIGN') {
    return 'Worker assignment is handled by the department head workflow in the web application, so L1 does not assign workers from WhatsApp.';
  }

  if (command === 'VIEWED') {
    if (!complaintId) {
      return 'Use VIEWED <Complaint ID>.';
    }

    await markComplaintViewedByL1(user, complaintId);
    return `Marked viewed for ${complaintId}.`;
  }

  if (command === 'ONSITE') {
    if (!complaintId) {
      return 'Use ONSITE <Complaint ID>.';
    }

    await markComplaintOnSiteByL1(user, complaintId);
    return `Marked on-site for ${complaintId}.`;
  }

  if (command === 'START') {
    if (!complaintId) {
      return 'Use START <Complaint ID>.';
    }

    await markComplaintWorkStartedByL1(user, complaintId);
    return `Marked work started for ${complaintId}.`;
  }

  if (command === 'PROOF') {
    if (!complaintId) {
      return 'Use PROOF <Complaint ID> <note> and attach an image.';
    }

    const images = await collectInboundImages(payload, 1);

    if (!images.length) {
      return 'Attach one proof image with the PROOF command.';
    }

    await uploadComplaintProofByL1(user, complaintId, {
      image: images[0],
      description: note || undefined,
    });

    return `Proof uploaded for ${complaintId}.`;
  }

  if (command === 'COMPLETE') {
    if (!complaintId) {
      return 'Use COMPLETE <Complaint ID> [note].';
    }

    const result = await completeComplaintByL1(user, complaintId, note || undefined);
    return `Completed ${complaintId}.\nStatus: ${formatStatusLabel(result.status)}\nWork Status: ${result.work_status}`;
  }

  if (command === 'ESCALATE') {
    if (!complaintId) {
      return 'Use ESCALATE <Complaint ID>.';
    }

    const result = await forwardComplaintToNextOfficer(user, complaintId);
    return `Forwarded to ${result.next_level}.\nDeadline: ${formatDateTime(result.deadline)}`;
  }

  return getRoleHelpMessage('L1');
}

async function handleL2Commands(user: User, body: string) {
  const { command, complaintId, note } = getCommandParts(body);

  if (command === 'MYTASKS') {
    return handleOfficerQueue(user);
  }

  if (command === 'TRACK') {
    return handleTrackCommand(user, complaintId);
  }

  if (command === 'REMINDL1') {
    if (!complaintId) {
      return 'Use REMINDL1 <Complaint ID> [note].';
    }

    await remindL1OfficerFromL2(user, complaintId, note || undefined);
    return `Reminder sent to L1 for ${complaintId}.`;
  }

  if (command === 'CLOSE') {
    if (!complaintId) {
      return 'Use CLOSE <Complaint ID> [note].';
    }

    await closeComplaintByL2Review(user, complaintId, note || undefined);
    return `Closed ${complaintId}.`;
  }

  if (command === 'REOPEN') {
    if (!complaintId) {
      return 'Use REOPEN <Complaint ID> [note].';
    }

    await reopenComplaintFromL2Review(user, complaintId, note || undefined);
    return `Reopened ${complaintId} and returned it to L1 field action.`;
  }

  return getRoleHelpMessage('L2');
}

async function handleL3Commands(user: User, body: string) {
  const { command, complaintId, note } = getCommandParts(body);

  if (command === 'MYTASKS') {
    return handleOfficerQueue(user);
  }

  if (command === 'TRACK') {
    return handleTrackCommand(user, complaintId);
  }

  if (command === 'REMINDL1') {
    if (!complaintId) {
      return 'Use REMINDL1 <Complaint ID> [note].';
    }

    await remindL1OfficerFromL3(user, complaintId, note || undefined);
    return `Reminder sent to L1 for ${complaintId}.`;
  }

  if (command === 'REMINDL2') {
    if (!complaintId) {
      return 'Use REMINDL2 <Complaint ID> [note].';
    }

    await remindL2OfficerFromL3(user, complaintId, note || undefined);
    return `Reminder sent to L2 for ${complaintId}.`;
  }

  if (command === 'CLOSE') {
    if (!complaintId) {
      return 'Use CLOSE <Complaint ID> [note].';
    }

    await closeComplaintByL2Review(user, complaintId, note || undefined);
    return `Closed ${complaintId}.`;
  }

  if (command === 'REOPEN') {
    if (!complaintId) {
      return 'Use REOPEN <Complaint ID> [note].';
    }

    await reopenComplaintFromL2Review(user, complaintId, note || undefined);
    return `Reopened ${complaintId} and returned it to L1 field action.`;
  }

  return getRoleHelpMessage('L3');
}

async function handleCitizenCommands(
  user: User,
  phone: string,
  session: SessionState,
  body: string,
  payload: TwilioPayload,
) {
  if (session.citizenDraft) {
    return handleCitizenDraftInput(user, phone, session, body, payload);
  }

  const { command, complaintId } = getCommandParts(body);

  if (command === 'COMPLAINT') {
    session.citizenDraft = createCitizenDraft();
    return [
      'Complaint flow started.',
      'Your registered phone and email will be used automatically.',
      getDraftPrompt(session.citizenDraft.step, user, undefined, session.citizenDraft),
    ].join('\n');
  }

  if (command === 'TRACK') {
    return handleTrackCommand(user, complaintId);
  }

  return getRoleHelpMessage('CITIZEN');
}

// Twilio always receives TwiML back, even when business logic fails.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    sendTwiml(res, 'This endpoint accepts Twilio WhatsApp POST webhooks only.', 405);
    return;
  }

  const payload = parsePayload(req.body);
  const from = payload.From || '';
  const body = (payload.Body || '').trim();
  const normalizedPhone = normalizeWhatsappPhone(from);

  if (!normalizedPhone) {
    sendTwiml(res, 'Unable to read the sender phone number.');
    return;
  }

  const session = getSession(normalizedPhone);

  try {
    const user = await getUserByPhone(normalizedPhone);

    if (!user) {
      if (body.trim().toUpperCase() === 'CANCEL' || body.trim().toUpperCase() === 'RESET') {
        sessions.delete(normalizedPhone);
        sendTwiml(res, SIGNUP_MENU);
        return;
      }

      sendTwiml(res, await handleUnauthenticatedUser(normalizedPhone, session, body));
      return;
    }

    resetSignupDraft(session);

    const allowedModes = getAllowedModes(user);

    if (!allowedModes.length) {
      sendTwiml(res, 'This phone number is linked to a website user without a supported WhatsApp role.');
      return;
    }

    if (session.role && !allowedModes.includes(session.role)) {
      session.role = undefined;
      resetCitizenDraft(session);
    }

    if (!session.role && allowedModes.length === 1) {
      session.role = allowedModes[0];
    }

    const normalizedBody = body.toUpperCase();
    const hasActiveCitizenDraft = session.role === 'CITIZEN' && Boolean(session.citizenDraft);
    const requestedMode = hasActiveCitizenDraft
      ? allowedModes.find((mode) => mode === normalizedBody) || null
      : resolveRequestedMode(body, allowedModes);

    if (requestedMode) {
      session.role = requestedMode;
      resetCitizenDraft(session);
      sendTwiml(res, `Mode set to ${requestedMode}.\n${getRoleHelpMessage(requestedMode)}`);
      return;
    }

    if (normalizedBody === 'RESET') {
      sessions.delete(normalizedPhone);
      sendTwiml(res, allowedModes.length === 1 ? getRoleHelpMessage(allowedModes[0]) : formatRoleMenu(allowedModes));
      return;
    }

    if (normalizedBody === 'CANCEL') {
      if (session.citizenDraft) {
        resetCitizenDraft(session);
        sendTwiml(res, 'Complaint draft cancelled.\nUse COMPLAINT to start again.');
        return;
      }

      sendTwiml(res, session.role ? getRoleHelpMessage(session.role) : formatRoleMenu(allowedModes));
      return;
    }

    if (!hasActiveCitizenDraft && isGreeting(normalizedBody)) {
      sendTwiml(res, session.role ? getRoleHelpMessage(session.role) : formatRoleMenu(allowedModes));
      return;
    }

    if (!session.role) {
      sendTwiml(res, formatRoleMenu(allowedModes));
      return;
    }

    let reply: string;

    if (session.role === 'CITIZEN') {
      reply = await handleCitizenCommands(user, normalizedPhone, session, body, payload);
    } else if (session.role === 'WORKER') {
      reply = await handleWorkerCommands(user, body, payload);
    } else if (session.role === 'L1') {
      reply = await handleL1Commands(user, body, payload);
    } else if (session.role === 'L2') {
      reply = await handleL2Commands(user, body);
    } else {
      reply = await handleL3Commands(user, body);
    }

    session.updatedAt = Date.now();
    sendTwiml(res, reply);
  } catch (error) {
    if (error instanceof AuthError) {
      sendTwiml(res, error.message);
      return;
    }

    if (error instanceof Error) {
      const message = error.message.trim();

      if (
        message === 'Unable to download the WhatsApp image from Twilio.' ||
        message === 'Attachment storage is not initialized. Run the latest database setup for file_uploads.'
      ) {
        sendTwiml(res, message);
        return;
      }
    }

    console.error('Failed to process Twilio WhatsApp webhook', error);
    sendTwiml(res, 'Something went wrong. Try again.');
  }
}
