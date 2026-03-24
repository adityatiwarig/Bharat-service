import {
  CircleHelp,
  FileSearch,
  Files,
  FolderClock,
  LayoutDashboard,
  LogIn,
  MapPinned,
  SearchCheck,
  Sparkles,
  UserRoundPlus,
} from 'lucide-react'

import type { AssistantAction, AssistantIntent } from './types'

export const ASSISTANT_STORAGE_KEY = 'govcrm-navigation-assistant-dismissed'
export const GREETING_MESSAGE =
  'Hello. Tell me your issue in one line and I will guide you.'

export const MAIN_ACTIONS: AssistantAction[] = [
  { key: 'complaint', label: 'Register Complaint', icon: UserRoundPlus },
  { key: 'status', label: 'Track Complaint', icon: SearchCheck },
  { key: 'login', label: 'Login / Register', icon: LogIn },
  { key: 'help', label: 'Help', icon: CircleHelp },
]

export const HELP_ACTIONS: AssistantAction[] = [
  { key: 'documents', label: 'Required Documents', icon: Files },
  { key: 'location', label: 'Location Help', icon: MapPinned },
  { key: 'tracker-guide', label: 'Complaint ID', icon: FileSearch },
  { key: 'departments', label: 'Choose Category', icon: Sparkles },
  { key: 'my-complaints', label: 'My Complaints', icon: FolderClock },
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

export const ASSISTANT_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <rect width="96" height="96" rx="48" fill="#ffffff"/>
  <circle cx="48" cy="48" r="45" fill="#f6f8fb" stroke="#d7dde3" stroke-width="2"/>
  <path d="M26 82c4-16 13-24 22-24s18 8 22 24H26z" fill="#123b5d"/>
  <path d="M34 82c4-12 9-18 14-18 6 0 12 6 16 18H34z" fill="#c96c3a"/>
  <circle cx="48" cy="38" r="17" fill="#e4b38d"/>
  <path d="M31 37c2-13 10-22 17-22 10 0 17 9 18 22-4-4-8-7-12-8-4 4-13 7-23 8z" fill="#1f2f46"/>
  <circle cx="42" cy="39" r="2" fill="#2b2b2b"/>
  <circle cx="54" cy="39" r="2" fill="#2b2b2b"/>
  <path d="M43 47c2 2 8 2 10 0" fill="none" stroke="#9a5b56" stroke-width="2" stroke-linecap="round"/>
  <circle cx="48" cy="32" r="1.8" fill="#8f2330"/>
</svg>
`)}` 

export const INTENTS: AssistantIntent[] = [
  {
    id: 'register-account',
    keywords: ['register', 'sign up', 'signup', 'create account', 'new account'],
    response: () =>
      'To create a new citizen account, open the registration page and complete your basic details first.',
    actions: [
      { key: 'register', label: 'Open Registration Page', icon: UserRoundPlus },
      { key: 'login', label: 'Open Login Page', icon: LogIn },
    ],
  },
  {
    id: 'complaint-register',
    keywords: ['complaint', 'register', 'raise', 'lodge', 'file complaint', 'shikayat', 'issue report'],
    response: ({ isCitizenArea }) =>
      isCitizenArea
        ? 'You can register a complaint from the Citizen Dashboard. Open the complaint page, add the details, location, ward, and any optional attachments, then submit.'
        : 'Please log in or register first, then open the complaint page and submit your grievance with the issue details, location, ward, and optional attachments.',
    actions: [
      { key: 'complaint', label: 'Open Complaint Page', icon: UserRoundPlus },
      { key: 'documents', label: 'Document Guide', icon: Files },
    ],
  },
  {
    id: 'login',
    keywords: ['login', 'log in', 'sign in', 'signin', 'account', 'register account', 'create account'],
    response: () =>
      'Use the login page to sign in or create a new account. Existing users can continue with their registered email and password.',
    actions: [
      { key: 'login', label: 'Open Login Page', icon: LogIn },
      { key: 'dashboard', label: 'Open Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'status-tracking',
    keywords: ['status', 'track', 'tracker', 'tracking', 'complaint id', 'case status', 'progress', 'timeline'],
    response: () =>
      'To check complaint status, open the tracker and enter your complaint ID. You can review stages such as submitted, assigned, in progress, and resolved.',
    actions: [
      { key: 'status', label: 'Open Status Tracker', icon: SearchCheck },
      { key: 'tracker-guide', label: 'Find Complaint ID', icon: FileSearch },
    ],
  },
  {
    id: 'documents',
    keywords: ['document', 'documents', 'photo', 'image', 'file', 'upload', 'attachment', 'proof', 'evidence'],
    response: () =>
      'Attachments are optional, but a clear photo or supporting file can help the field team understand the issue faster. A precise description and location also improve routing.',
    actions: [
      { key: 'complaint', label: 'Open Complaint Page', icon: UserRoundPlus },
      { key: 'location', label: 'Location Help', icon: MapPinned },
    ],
  },
  {
    id: 'ward-location',
    keywords: ['ward', 'location', 'address', 'landmark', 'gps', 'map', 'nearest', 'area'],
    response: () =>
      'Select the ward based on your area. Adding a nearby landmark, address, and live location helps the team reach the correct spot faster.',
    actions: [
      { key: 'location', label: 'Location Help', icon: MapPinned },
      { key: 'complaint', label: 'Open Complaint Page', icon: UserRoundPlus },
    ],
  },
  {
    id: 'congested-area',
    keywords: [
      'congested area',
      'conjected area',
      'crowded area',
      'busy area',
      'market area',
      'traffic jam',
      'heavy traffic',
      'illegal parking',
      'blocked road',
      'narrow lane',
    ],
    response: () =>
      'You can write: "This area is highly congested due to illegal parking, encroachment, or heavy traffic. Nearby landmark: [landmark]. Ward: [ward]." For this kind of issue, Roads or Encroachment may be the best category.',
    actions: [
      { key: 'departments', label: 'Choose Category', icon: Sparkles },
      { key: 'location', label: 'Location Help', icon: MapPinned },
    ],
  },
  {
    id: 'departments-categories',
    keywords: ['department', 'category', 'road', 'water', 'garbage', 'drainage', 'sanitation', 'noise', 'construction', 'encroachment'],
    response: () =>
      'Available categories include roads, water and sanitation, garbage collection, encroachment, illegal construction, and noise pollution. Choosing the right category helps route the complaint faster.',
    actions: [
      { key: 'departments', label: 'View Categories', icon: Sparkles },
      { key: 'yojana', label: 'View Services', icon: Sparkles },
    ],
  },
  {
    id: 'process-time',
    keywords: ['how long', 'days', 'time', 'resolution', 'resolve', 'assign', 'process', 'timeline', 'when'],
    response: () =>
      'The usual flow is complaint submission, assignment, field action, updates, and resolution. Timelines vary by issue and department, but the tracker shows live progress.',
    actions: [
      { key: 'process', label: 'View Process', icon: FolderClock },
      { key: 'status', label: 'Open Status Tracker', icon: SearchCheck },
    ],
  },
  {
    id: 'history',
    keywords: ['my complaints', 'history', 'old complaint', 'previous complaint', 'all complaints', 'meri complaint'],
    response: ({ isCitizenArea }) =>
      isCitizenArea
        ? 'Use My Complaints to review your current and previous complaints. You can open the tracker for any item from there.'
        : 'After logging in, you can use My Complaints to review your current and previous complaints.',
    actions: [
      { key: 'my-complaints', label: 'Open My Complaints', icon: FolderClock },
      { key: 'status', label: 'Open Status Tracker', icon: SearchCheck },
    ],
  },
  {
    id: 'yojana-services',
    keywords: ['yojana', 'scheme', 'service', 'services', 'citizen service'],
    response: () =>
      'The landing page includes a citizen services section that explains available municipal complaint categories and supported service areas.',
    actions: [
      { key: 'yojana', label: 'View Services', icon: Sparkles },
      { key: 'complaint', label: 'Open Complaint Page', icon: UserRoundPlus },
    ],
  },
  {
    id: 'complaint-id',
    keywords: ['id kaha', 'complaint id kaha', 'id milega', 'tracking id', 'reference number', 'complaint number'],
    response: () =>
      'After submission, you receive a complaint ID that can be used in the tracker. You can also review the same complaint from My Complaints.',
    actions: [
      { key: 'tracker-guide', label: 'Complaint ID Help', icon: FileSearch },
      { key: 'status', label: 'Open Status Tracker', icon: SearchCheck },
    ],
  },
  {
    id: 'emergency',
    keywords: ['emergency', 'urgent', 'danger', 'ambulance', 'fire', 'police', 'accident'],
    minScore: 1,
    response: () =>
      'This portal is intended for municipal complaints. For immediate danger or emergencies, please contact the relevant emergency service or official helpline.',
    actions: [{ key: 'complaint', label: 'Open Complaint Page', icon: UserRoundPlus }],
  },
  {
    id: 'payment-fee',
    keywords: ['fee', 'fees', 'charge', 'charges', 'payment', 'pay'],
    response: () =>
      'The current complaint flow does not show a payment step. You can submit the form directly with complaint details, ward, location, and optional attachments.',
    actions: [{ key: 'complaint', label: 'Open Complaint Page', icon: UserRoundPlus }],
  },
  {
    id: 'anonymous',
    keywords: ['without login', 'without account', 'anonymous', 'guest', 'login ke bina'],
    response: () =>
      'The current flow is designed for logged-in users so complaint tracking and complaint history remain linked to your account.',
    actions: [
      { key: 'login', label: 'Login / Register', icon: LogIn },
      { key: 'status', label: 'Open Status Tracker', icon: SearchCheck },
    ],
  },
  {
    id: 'greeting',
    keywords: ['hi', 'hello', 'namaste', 'hey'],
    minScore: 1,
    response: () =>
      'Hello. I can help with complaint registration, status tracking, login, documents, location, and dashboard access.',
    actions: MAIN_ACTIONS,
  },
  {
    id: 'thanks',
    keywords: ['thanks', 'thank you', 'shukriya'],
    minScore: 1,
    response: () =>
      'Happy to help. If you want, I can take you to the complaint page, tracker, or dashboard.',
    actions: [
      { key: 'complaint', label: 'Open Complaint Page', icon: UserRoundPlus },
      { key: 'status', label: 'Open Status Tracker', icon: SearchCheck },
    ],
  },
]
