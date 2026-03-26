'use client'

import * as React from 'react'
import {
  FolderClock,
  LayoutDashboard,
  MapPinned,
  Minus,
  SearchCheck,
  Send,
  Sparkles,
  UserRoundPlus,
  X,
} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

import {
  EMPTY_ASSISTANT_MEMORY,
  normalizeAssistantMemory,
  resolveCitizenAssistantQuery,
} from './assistant-engine'
import {
  ASSISTANT_AVATAR,
  ASSISTANT_STORAGE_KEY,
  GREETING_MESSAGE,
  HELP_ACTIONS,
  INTENTS,
  MAIN_ACTIONS,
} from './config'
import type {
  AssistantAction,
  AssistantActionButton,
  AssistantContextMemory,
  AssistantActionKey,
  AssistantIntent,
  ChatMessage,
  CitizenAssistantResolution,
} from './types'
import { fetchChatbotReply } from '../../lib/client/chatbot'
import { cn } from '../../lib/utils'

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

function getResolutionActions(resolution: CitizenAssistantResolution) {
  return resolution.actionButtons?.length ? resolution.actionButtons : undefined
}

export function GuidedCitizenAssistant() {
  const pathname = usePathname()
  const router = useRouter()
  const timersRef = React.useRef<number[]>([])
  const sessionStatusRef = React.useRef<boolean | null>(null)
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null)
  const messagesRef = React.useRef<ChatMessage[]>([])
  const memoryRef = React.useRef<AssistantContextMemory>(EMPTY_ASSISTANT_MEMORY)
  const [ready, setReady] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  const [isTyping, setIsTyping] = React.useState(false)
  const [isDismissed, setIsDismissed] = React.useState(false)
  const [hasGreeted, setHasGreeted] = React.useState(false)
  const [draft, setDraft] = React.useState('')
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [assistantMemory, setAssistantMemory] = React.useState<AssistantContextMemory>(
    EMPTY_ASSISTANT_MEMORY,
  )

  const resolvedPathname = pathname ?? '/'
  const shouldRender = resolvedPathname === '/' || resolvedPathname.startsWith('/citizen')
  const isCitizenArea = resolvedPathname.startsWith('/citizen')

  React.useEffect(() => {
    setReady(true)
    const storedValue = window.localStorage.getItem(ASSISTANT_STORAGE_KEY)
    setIsDismissed(storedValue === 'true')
  }, [])

  React.useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  React.useEffect(() => {
    memoryRef.current = assistantMemory
  }, [assistantMemory])

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

  React.useEffect(() => {
    sessionStatusRef.current = isCitizenArea ? true : null
  }, [isCitizenArea, pathname])

  function rememberDismissed(value: boolean) {
    setIsDismissed(value)
    window.localStorage.setItem(ASSISTANT_STORAGE_KEY, value ? 'true' : 'false')
  }

  function queueBotMessage(
    text: string,
    actions?: AssistantAction[],
    delay = 520,
    variant: ChatMessage['variant'] = 'default',
    extras?: {
      suggestions?: string[]
      actionButtons?: AssistantActionButton[]
    },
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
            suggestions: extras?.suggestions,
            actionButtons: extras?.actionButtons,
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

  function queueStructuredResponse(
    resolution: CitizenAssistantResolution,
    delay = 260,
  ) {
    if (resolution.memory) {
      setAssistantMemory(normalizeAssistantMemory(resolution.memory))
    }

    queueBotMessage(
      resolution.message,
      undefined,
      delay,
      'highlight',
      {
        suggestions: resolution.suggestions,
        actionButtons: getResolutionActions(resolution),
      },
    )
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
    return '/citizen'
  }

  function getStatusPath() {
    return '/track'
  }

  function getLoginPath() {
    return '/auth'
  }

  function getRegisterPath() {
    return '/auth'
  }

  function getDashboardPath() {
    return '/citizen'
  }

  function getMyComplaintsPath() {
    return '/citizen/my-complaints'
  }

  function resolveButtonRoute(route: string) {
    if (route === '/track') {
      return getStatusPath()
    }

    if (route === '/citizen') {
      return getDashboardPath()
    }

    if (route === '/citizen/submit') {
      return getComplaintPath()
    }

    if (route === '/citizen/my-complaints') {
      return getMyComplaintsPath()
    }

    if (route === '/citizen/tracker') {
      return getStatusPath()
    }

    return route
  }

  async function fetchSessionState(force = false) {
    if (!force && sessionStatusRef.current !== null) {
      return sessionStatusRef.current
    }

    try {
      const response = await fetch('/api/session/me', {
        cache: 'no-store',
      })

      if (!response.ok) {
        sessionStatusRef.current = false
        return false
      }

      const data = (await response.json()) as {
        user?: Record<string, unknown> | null
      }

      const isLoggedIn = Boolean(data.user)
      sessionStatusRef.current = isLoggedIn
      return isLoggedIn
    } catch (_error) {
      sessionStatusRef.current = false
      return false
    }
  }

  async function resolveRouteWithSession(route: string) {
    const normalizedRoute = resolveButtonRoute(route)

    if (normalizedRoute.startsWith('/citizen')) {
      const isLoggedIn = await fetchSessionState()
      return isLoggedIn ? normalizedRoute : '/auth'
    }

    return normalizedRoute
  }

  function goToPath(path: string) {
    setIsOpen(false)
    router.push(path)
  }

  async function handleRouteButtonClick(button: AssistantActionButton) {
    addUserMessage(button.label)
    const path = await resolveRouteWithSession(button.route)
    goToPath(path)
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

  function scheduleFollowUp(callback: () => void | Promise<void>, delay = 800) {
    const timerId = window.setTimeout(() => {
      void callback()
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
      queueRedirectNotice('Opening the next step...', async () => {
        const path = await resolveRouteWithSession(getComplaintPath())
        goToPath(path)
      })
      return
    }

    if (action.key === 'register') {
      queueRedirectNotice('Opening login and registration...', async () => {
        const path = await resolveRouteWithSession(getRegisterPath())
        goToPath(path)
      })
      return
    }

    if (action.key === 'login') {
      queueRedirectNotice('Opening login and registration...', async () => {
        const path = await resolveRouteWithSession(getLoginPath())
        goToPath(path)
      })
      return
    }

    if (action.key === 'status') {
      queueRedirectNotice('Opening complaint tracker...', async () => {
        const path = await resolveRouteWithSession(getStatusPath())
        goToPath(path)
      })
      return
    }

    if (action.key === 'yojana') {
      queueRedirectNotice('Redirecting you to the services section...', () => goToSection('yojana', '/#yojana'))
      return
    }

    if (action.key === 'dashboard') {
      queueRedirectNotice('Opening dashboard...', async () => {
        const path = await resolveRouteWithSession(getDashboardPath())
        goToPath(path)
      })
      return
    }

    if (action.key === 'my-complaints') {
      queueRedirectNotice('Opening your complaints...', async () => {
        const path = await resolveRouteWithSession(getMyComplaintsPath())
        goToPath(path)
      })
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

  async function submitCitizenQuestion(value: string) {
    addUserMessage(value)
    setDraft('')

    try {
      const structuredResolution = await fetchChatbotReply(
        value,
        memoryRef.current,
      )

      if (structuredResolution?.message) {
        queueStructuredResponse(structuredResolution)
        return
      }
    } catch (_error) {
      const isLoggedIn = await fetchSessionState()
      const structuredResolution = resolveCitizenAssistantQuery(
        value,
        memoryRef.current,
        { isLoggedIn },
      )

      if (structuredResolution) {
        queueStructuredResponse(structuredResolution)
        return
      }
    }

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

    void submitCitizenQuestion(value)
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

                      {message.actionButtons?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {message.actionButtons.map((button) => (
                              <button
                                key={`${message.id}-${button.route}-${button.label}`}
                                type="button"
                                onClick={() => void handleRouteButtonClick(button)}
                                className="inline-flex items-center rounded-full border border-[#123b5d] bg-[#123b5d] px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#0f324e]"
                              >
                              <span>{button.label}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {message.suggestions?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {message.suggestions.map((suggestion) => (
                            <button
                              key={`${message.id}-${suggestion}`}
                              type="button"
                              onClick={() => void submitCitizenQuestion(suggestion)}
                              className="inline-flex items-center rounded-full border border-[#d7dde3] bg-white px-3 py-1.5 text-[11px] font-medium text-[#123b5d] transition hover:border-[#123b5d]"
                            >
                              <span>{suggestion}</span>
                            </button>
                          ))}
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
