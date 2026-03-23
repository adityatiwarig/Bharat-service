'use client'

import * as React from 'react'
import {
  CircleHelp,
  FileSearch,
  Files,
  FolderClock,
  LayoutDashboard,
  LogIn,
  MapPinned,
  Minus,
  SearchCheck,
  Send,
  Sparkles,
  UserRoundPlus,
  X,
} from 'lucide-react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'
import { usePathname, useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'

type AssistantActionKey =
  | 'complaint'
  | 'register'
  | 'login'
  | 'status'
  | 'yojana'
  | 'help'
  | 'dashboard'
  | 'my-complaints'
  | 'tracker-guide'
  | 'documents'
  | 'location'
  | 'departments'
  | 'process'

type AssistantAction = {
  key: AssistantActionKey
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

type ChatMessage = {
  id: string
  sender: 'bot' | 'user'
  text: string
  actions?: AssistantAction[]
  variant?: 'default' | 'highlight'
}

type AssistantIntent = {
  id: string
  keywords: string[]
  minScore?: number
  response: (context: { isCitizenArea: boolean }) => string
  actions?: AssistantAction[]
}

const ASSISTANT_STORAGE_KEY = 'govcrm-navigation-assistant-dismissed'
const GREETING_MESSAGE =
  'Hello \u{1F44B} I\u2019m Sevika Assistant. How can I help you today?'

const MAIN_ACTIONS: AssistantAction[] = [
  { key: 'complaint', label: 'Register Complaint', icon: UserRoundPlus },
  { key: 'status', label: 'Check Status', icon: SearchCheck },
  { key: 'register', label: 'Register', icon: UserRoundPlus },
  { key: 'login', label: 'Login', icon: LogIn },
  { key: 'help', label: 'Help', icon: CircleHelp },
]

const HELP_ACTIONS: AssistantAction[] = [
  { key: 'documents', label: 'Required Documents', icon: Files },
  { key: 'location', label: 'Location Help', icon: MapPinned },
  { key: 'tracker-guide', label: 'Complaint ID', icon: FileSearch },
  { key: 'departments', label: 'Choose Category', icon: Sparkles },
  { key: 'my-complaints', label: 'My Complaints', icon: FolderClock },
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

const ASSISTANT_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
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

const INTENTS: AssistantIntent[] = [
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
    actions: [
      { key: 'complaint', label: 'Open Complaint Page', icon: UserRoundPlus },
    ],
  },
  {
    id: 'payment-fee',
    keywords: ['fee', 'fees', 'charge', 'charges', 'payment', 'pay'],
    response: () =>
      'The current complaint flow does not show a payment step. You can submit the form directly with complaint details, ward, location, and optional attachments.',
    actions: [
      { key: 'complaint', label: 'Open Complaint Page', icon: UserRoundPlus },
    ],
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

function createMessageId() {
  return `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeQuery(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function findBestIntent(query: string) {
  const normalizedQuery = normalizeQuery(query)

  if (!normalizedQuery) {
    return null
  }

  let bestIntent: AssistantIntent | null = null
  let bestScore = 0

  for (const intent of INTENTS) {
    let score = 0

    for (const keyword of intent.keywords) {
      const normalizedKeyword = normalizeQuery(keyword)

      if (!normalizedKeyword) {
        continue
      }

      if (normalizedQuery.includes(normalizedKeyword)) {
        score += normalizedKeyword.includes(' ') ? 3 : 2
      } else if (
        normalizedKeyword.split(' ').every((part) => normalizedQuery.includes(part))
      ) {
        score += 1
      }
    }

    if (score >= (intent.minScore ?? 2) && score > bestScore) {
      bestScore = score
      bestIntent = intent
    }
  }

  return bestIntent
}

function getPrimaryActionClass(key: AssistantActionKey) {
  if (key === 'complaint') {
    return 'border-[#123b5d] bg-[#123b5d] text-white hover:bg-[#0f324e]'
  }

  return 'border-[#dcdcdc] bg-white text-[#1a1a1a] hover:border-[#123b5d]'
}

function getInlineActionClass(key: AssistantActionKey) {
  if (key === 'complaint') {
    return 'border-[#123b5d] bg-[#123b5d] text-white hover:bg-[#0f324e]'
  }

  return 'border-[#dcdcdc] bg-white text-[#1a1a1a] hover:border-[#123b5d]'
}

function GuidedCitizenAssistant() {
  const pathname = usePathname()
  const router = useRouter()
  const timersRef = React.useRef<number[]>([])
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null)
  const messagesRef = React.useRef<ChatMessage[]>([])
  const [ready, setReady] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  const [isTyping, setIsTyping] = React.useState(false)
  const [isDismissed, setIsDismissed] = React.useState(false)
  const [hasGreeted, setHasGreeted] = React.useState(false)
  const [draft, setDraft] = React.useState('')
  const [messages, setMessages] = React.useState<ChatMessage[]>([])

  const shouldRender = pathname === '/' || pathname.startsWith('/citizen')
  const isCitizenArea = pathname.startsWith('/citizen')

  React.useEffect(() => {
    setReady(true)
    const storedValue = window.localStorage.getItem(ASSISTANT_STORAGE_KEY)
    setIsDismissed(storedValue === 'true')
  }, [])

  React.useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  React.useEffect(() => {
    if (!isTyping) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [isTyping, messages])

  React.useEffect(() => {
    return () => {
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId))
      timersRef.current = []
    }
  }, [])

  React.useEffect(() => {
    if (!ready || !shouldRender || isDismissed || hasGreeted) {
      return
    }

    const timerId = window.setTimeout(() => {
      setIsOpen(true)
      setHasGreeted(true)
      queueBotMessage(GREETING_MESSAGE, undefined, 500, 'highlight')
    }, 2000)

    timersRef.current.push(timerId)

    return () => {
      window.clearTimeout(timerId)
      timersRef.current = timersRef.current.filter((currentId) => currentId !== timerId)
    }
  }, [hasGreeted, isDismissed, ready, shouldRender])

  React.useEffect(() => {
    if (!shouldRender) {
      setIsOpen(false)
    }
  }, [shouldRender])

  function rememberDismissed(value: boolean) {
    setIsDismissed(value)
    window.localStorage.setItem(ASSISTANT_STORAGE_KEY, value ? 'true' : 'false')
  }

  function queueBotMessage(
    text: string,
    actions?: AssistantAction[],
    delay = 520,
    variant: ChatMessage['variant'] = 'default',
  ) {
    const lastMessage = messagesRef.current[messagesRef.current.length - 1]

    if (lastMessage?.sender === 'bot' && lastMessage.text === text) {
      return
    }

    setIsTyping(true)
    const timerId = window.setTimeout(() => {
      setMessages((current) => {
        const latestMessage = current[current.length - 1]

        if (latestMessage?.sender === 'bot' && latestMessage.text === text) {
          return current
        }

        return [
          ...current,
          {
            id: createMessageId(),
            sender: 'bot',
            text,
            actions,
            variant,
          },
        ]
      })
      setIsTyping(false)
      timersRef.current = timersRef.current.filter((currentId) => currentId !== timerId)
    }, delay)

    timersRef.current.push(timerId)
  }

  function addUserMessage(text: string) {
    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        sender: 'user',
        text,
      },
    ])
  }

  function ensureGreeting(delay = 280) {
    if (hasGreeted) {
      return
    }

    setHasGreeted(true)
    queueBotMessage(GREETING_MESSAGE, undefined, delay, 'highlight')
  }

  function openAssistant() {
    if (isDismissed) {
      rememberDismissed(false)
    }

    setIsOpen(true)
    ensureGreeting()
  }

  function getComplaintPath() {
    return isCitizenArea ? '/citizen/submit' : '/auth?mode=signup&next=%2Fcitizen%2Fsubmit'
  }

  function getStatusPath() {
    return isCitizenArea ? '/citizen/tracker' : '/track'
  }

  function getLoginPath() {
    return '/auth?mode=login&next=%2Fcitizen'
  }

  function getRegisterPath() {
    return '/auth?mode=signup&next=%2Fcitizen'
  }

  function getDashboardPath() {
    return isCitizenArea ? '/citizen' : '/auth?mode=login&next=%2Fcitizen'
  }

  function getMyComplaintsPath() {
    return isCitizenArea ? '/citizen/my-complaints' : '/auth?mode=login&next=%2Fcitizen%2Fmy-complaints'
  }

  function goToPath(path: string) {
    setIsOpen(false)
    router.push(path)
  }

  function goToSection(sectionId: string, fallbackPath: string) {
    setIsOpen(false)

    if (pathname === '/') {
      const section = document.getElementById(sectionId)
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }

    router.push(fallbackPath)
  }

  function scheduleFollowUp(callback: () => void, delay = 800) {
    const timerId = window.setTimeout(() => {
      callback()
      timersRef.current = timersRef.current.filter((currentId) => currentId !== timerId)
    }, delay)

    timersRef.current.push(timerId)
  }

  function queueRedirectNotice(text: string, callback: () => void) {
    queueBotMessage(text, undefined, 220, 'highlight')
    scheduleFollowUp(callback, 800)
  }

  function replyToAction(action: AssistantAction) {
    if (action.key === 'complaint') {
      queueRedirectNotice('Redirecting you to the complaint page...', () => goToPath(getComplaintPath()))
      return
    }

    if (action.key === 'register') {
      queueRedirectNotice('Redirecting you to the registration page...', () => goToPath(getRegisterPath()))
      return
    }

    if (action.key === 'login') {
      queueRedirectNotice('Redirecting you to the login page...', () => goToPath(getLoginPath()))
      return
    }

    if (action.key === 'status') {
      queueRedirectNotice('Redirecting you to the status tracker...', () => goToPath(getStatusPath()))
      return
    }

    if (action.key === 'yojana') {
      queueRedirectNotice('Redirecting you to the services section...', () => goToSection('yojana', '/#yojana'))
      return
    }

    if (action.key === 'dashboard') {
      queueRedirectNotice('Redirecting you to the dashboard...', () => goToPath(getDashboardPath()))
      return
    }

    if (action.key === 'my-complaints') {
      queueRedirectNotice('Redirecting you to your complaints...', () => goToPath(getMyComplaintsPath()))
      return
    }

    if (action.key === 'tracker-guide') {
      queueBotMessage(
        'You receive a complaint ID after submission. You can use that ID in the tracker to view updates and progress.',
        [
          { key: 'status', label: 'Open Status Tracker', icon: SearchCheck },
          { key: 'my-complaints', label: 'My Complaints', icon: FolderClock },
        ],
      )
      return
    }

    if (action.key === 'documents') {
      queueBotMessage(
        'Attachments are optional, but a clear photo or supporting file can help the field team understand the issue faster. A precise description and location also improve routing.',
        [
          { key: 'complaint', label: 'Open Complaint Page', icon: UserRoundPlus },
          { key: 'location', label: 'Location Help', icon: MapPinned },
        ],
      )
      return
    }

    if (action.key === 'location') {
      queueBotMessage(
        'Choose the ward based on your area. A nearby landmark, address, and live location help the team route the complaint correctly.',
        [
          { key: 'complaint', label: 'Open Complaint Page', icon: UserRoundPlus },
          { key: 'status', label: 'Open Status Tracker', icon: SearchCheck },
        ],
      )
      return
    }

    if (action.key === 'departments') {
      queueBotMessage(
        'Available categories include roads, water and sanitation, garbage collection, encroachment, illegal construction, and noise pollution. Choosing the right category helps route the complaint faster.',
        [
          { key: 'yojana', label: 'View Services', icon: Sparkles },
          { key: 'complaint', label: 'Open Complaint Page', icon: UserRoundPlus },
        ],
      )
      return
    }

    if (action.key === 'process') {
      queueBotMessage(
        'The complaint flow usually moves through submission, assignment, field action, updates, and resolution. The tracker is the best place to monitor progress.',
        [
          { key: 'status', label: 'Open Status Tracker', icon: SearchCheck },
          { key: 'my-complaints', label: 'My Complaints', icon: FolderClock },
        ],
      )
      return
    }

    queueBotMessage('Choose one of the help options below and I will guide you.', HELP_ACTIONS)
  }

  function handleActionSelection(action: AssistantAction) {
    addUserMessage(action.label)

    if (action.key === 'help') {
      queueBotMessage('Choose one of the help options below and I will guide you.', HELP_ACTIONS)
      return
    }

    replyToAction(action)
  }

  function handleClose() {
    setIsOpen(false)
    rememberDismissed(true)
  }

  function submitCitizenQuestion(value: string) {
    addUserMessage(value)
    setDraft('')

    const normalizedValue = normalizeQuery(value)
    const directAction = MAIN_ACTIONS.find(
      (action) => normalizeQuery(action.label) === normalizedValue,
    )

    if (directAction) {
      replyToAction(directAction)
      return
    }

    const matchedIntent = findBestIntent(value)

    if (matchedIntent) {
      queueBotMessage(
        matchedIntent.response({ isCitizenArea }),
        matchedIntent.actions,
      )
      return
    }

    queueBotMessage(
      'I can help with complaint registration, login, status tracking, location, documents, categories, and complaint IDs.',
      HELP_ACTIONS,
    )
  }

  function handleKeywordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = draft.trim()

    if (!value) {
      return
    }

    submitCitizenQuestion(value)
  }

  if (!ready || !shouldRender) {
    return null
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-4 z-[90] flex flex-col items-end gap-3 sm:right-5">
      <div
        className={cn(
          'pointer-events-auto flex h-[min(74vh,620px)] max-h-[calc(100vh-5.5rem)] w-[calc(100vw-1.25rem)] max-w-[320px] flex-col overflow-hidden rounded-[12px] border border-[#e5e7eb] bg-white shadow-[0_10px_30px_rgba(18,59,93,0.08)] transition-all duration-300 sm:w-[320px]',
          isOpen
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-4 scale-95 opacity-0',
        )}
      >
        <div className="bg-[#123b5d] px-4 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white/10">
                <img
                  src={ASSISTANT_AVATAR}
                  alt="Assistant icon"
                  className="h-7 w-7 rounded-full bg-white object-cover"
                />
              </div>

              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold">Sevika Assistant</div>
                <div className="mt-0.5 text-[12px] font-medium text-white/80">Citizen Support</div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-white/90 transition hover:bg-white/10"
                aria-label="Minimize assistant"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-white/90 transition hover:bg-white/10"
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col bg-white">
          <div className="border-b border-[#eef1f4] px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {MAIN_ACTIONS.map((action) => {
                return (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => handleActionSelection(action)}
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-medium transition',
                      getPrimaryActionClass(action.key),
                    )}
                  >
                    <span>{action.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="min-h-[210px] flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:min-h-[240px]">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn('flex', message.sender === 'user' ? 'justify-end' : 'justify-start')}
              >
                {message.sender === 'bot' ? (
                  <div className="flex max-w-[92%] items-end gap-2">
                    <img
                      src={ASSISTANT_AVATAR}
                      alt="Assistant icon"
                      className="h-7 w-7 shrink-0 rounded-full border border-[#e5e7eb] bg-white object-cover"
                    />
                    <div className="space-y-2">
                      <div
                        className={cn(
                          'rounded-[10px] border border-[#e5e7eb] bg-[#f1f3f5] px-3 py-2.5 text-[13px] leading-5 text-[#1f2933]',
                          message.variant === 'highlight' ? 'font-medium' : '',
                        )}
                      >
                        {message.text}
                      </div>

                      {message.actions?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {message.actions.map((action) => {
                            return (
                              <button
                                key={`${message.id}-${action.key}`}
                                type="button"
                                onClick={() => handleActionSelection(action)}
                                className={cn(
                                  'inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-medium transition',
                                  getInlineActionClass(action.key),
                                )}
                              >
                                <span>{action.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[85%] rounded-[10px] bg-[#123b5d] px-3 py-2.5 text-[13px] font-medium leading-5 text-white">
                    {message.text}
                  </div>
                )}
              </div>
            ))}

            {isTyping ? (
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <img
                    src={ASSISTANT_AVATAR}
                    alt="Assistant icon"
                    className="h-7 w-7 shrink-0 rounded-full border border-[#e5e7eb] bg-white object-cover"
                  />
                  <div className="inline-flex items-center gap-1 rounded-[10px] border border-[#e5e7eb] bg-[#f1f3f5] px-3 py-2.5 text-[#123b5d]">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#123b5d] [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#123b5d] [animation-delay:-0.1s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#123b5d]" />
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-[#eef1f4] px-4 py-3">
            <form onSubmit={handleKeywordSubmit}>
              <div className="flex items-center gap-2 rounded-[10px] border border-[#d7dde3] bg-white px-3 py-2">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Type your message..."
                  className="h-8 flex-1 border-0 bg-transparent text-sm font-medium text-[#111827] outline-none placeholder:text-[#6b7280]"
                />
                <button
                  type="submit"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#123b5d] text-white transition hover:bg-[#0f324e]"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={openAssistant}
        className="pointer-events-auto relative inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#123b5d] text-white shadow-[0_12px_24px_rgba(18,59,93,0.18)] transition hover:bg-[#0f324e]"
        aria-label="Open Sevika Assistant"
      >
        <img
          src={ASSISTANT_AVATAR}
          alt="Assistant face"
          className="h-8 w-8 rounded-full border border-white/30 bg-white object-cover"
        />
        {!isOpen && !isDismissed ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#ff9933] px-1 text-[10px] font-semibold text-slate-900">
            1
          </span>
        ) : null}
      </button>
    </div>
  )
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      {children}
      <GuidedCitizenAssistant />
    </NextThemesProvider>
  )
}
