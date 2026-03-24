import citizenTraining from '../citizen-training.json'
import type {
  AssistantContextMemory,
  AssistantIntentResult,
  CitizenAssistantResolution,
  PossibleCategory,
  PreferredLanguage,
} from '../types'
import { updateContextMemory } from './context-memory'

const complaintRoute =
  citizenTraining.pages.find((page) => page.route === '/citizen')?.route || '/citizen'
const trackingRoute =
  citizenTraining.pages.find((page) => page.route === '/track')?.route || '/track'
const authRoute = '/auth'

function pickVariant(options: string[], seedSource: string) {
  const seed = seedSource
    .split('')
    .reduce((total, character) => total + character.charCodeAt(0), 0)

  return options[seed % options.length]
}

function buildResponse(input: {
  message: string
  suggestions?: string[]
  actionButtons?: Array<{ label: string; route: string }>
  route?: string
  action?: 'redirect' | 'respond' | 'suggest'
  memory: AssistantContextMemory
  intent: AssistantIntentResult['intent']
  meta?: CitizenAssistantResolution['meta']
}) {
  return {
    message: input.message,
    tone: 'friendly human',
    suggestions: input.suggestions || [],
    actionButtons: input.actionButtons || [],
    route: input.route,
    action: input.action || 'respond',
    intent: input.intent,
    memory: input.memory,
    meta: input.meta,
  } satisfies CitizenAssistantResolution
}

function isEnglish(preferredLanguage: PreferredLanguage) {
  return preferredLanguage === 'english'
}

function titleCase(value: string) {
  return value
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getLead(
  seed: string,
  preferredLanguage: PreferredLanguage,
  tone: 'neutral' | 'warm' | 'correction',
) {
  if (tone === 'correction') {
    return pickVariant(
      isEnglish(preferredLanguage)
        ? ["You're right.", 'Fair point.', "You're right about that."]
        : ["You're right.", 'Sahi pakda.', 'Theek bola aapne.'],
      seed,
    )
  }

  if (tone === 'warm') {
    return pickVariant(
      isEnglish(preferredLanguage)
        ? ['Got it.', 'Understood.', 'I see.']
        : ['Got it.', 'Samajh gaya.', 'Theek hai.'],
      seed,
    )
  }

  return pickVariant(
    isEnglish(preferredLanguage)
      ? ['Okay.', 'Sure.', 'All right.']
      : ['Theek hai.', 'Bilkul.', 'Achha.'],
    seed,
  )
}

function summarizeCandidate(candidate?: PossibleCategory) {
  return candidate?.label || ''
}

function formatPortalOnlyIssueDepartment(
  department: string,
  category: string,
  preferredLanguage: PreferredLanguage,
) {
  if (!department && !category) {
    return preferredLanguage === 'english' ? 'portal complaint' : 'portal complaint'
  }

  if (!department) {
    return category
  }

  const normalizedDepartment = department.toLowerCase()

  if (
    normalizedDepartment.includes('cleanliness') ||
    normalizedDepartment.includes('swachhta')
  ) {
    return preferredLanguage === 'english'
      ? 'Cleanliness (Swachhta)'
      : 'Cleanliness (Swachhta)'
  }

  return department
}

function formatChoiceList(
  categories: PossibleCategory[],
  preferredLanguage: PreferredLanguage,
) {
  const labels = categories
    .slice(0, 2)
    .map((category) => summarizeCandidate(category))
    .filter(Boolean)

  if (!labels.length) {
    return ''
  }

  if (labels.length === 1) {
    return labels[0]
  }

  return `${labels[0]} ${isEnglish(preferredLanguage) ? 'or' : 'ya'} ${labels[1]}`
}

function buildMeta(
  analysis: AssistantIntentResult,
  override?: Partial<NonNullable<CitizenAssistantResolution['meta']>>,
) {
  return {
    category: override?.category ?? analysis.entities.category,
    department: override?.department ?? analysis.entities.department,
    confidence: override?.confidence ?? analysis.confidence,
    possibleCategories:
      override?.possibleCategories ?? analysis.possibleCategories,
    preferredLanguage:
      override?.preferredLanguage ?? analysis.preferredLanguage,
  }
}

export function buildGreetingResponse(
  query: string,
  memory: AssistantContextMemory,
  analysis: AssistantIntentResult,
) {
  const nextMemory = updateContextMemory({
    previous: memory,
    intent: 'GREETING',
    entities: { topic: 'greeting' },
    action: 'start_chat',
    query,
    preferredLanguage: analysis.preferredLanguage,
  })

  const message = isEnglish(analysis.preferredLanguage)
    ? pickVariant(
        [
          "Hello. Tell me the issue in one line and I'll guide you.",
          "Hi there. Share the issue briefly and I'll figure out the best next step.",
        ],
        query,
      )
    : pickVariant(
        [
          'Hello. Bas issue ek line mein batao, main best next step bata dunga.',
          'Hi. Aap short mein issue batao, main sahi direction dunga.',
        ],
        query,
      )

  return buildResponse({
    message,
    suggestions: isEnglish(analysis.preferredLanguage)
      ? ['Garbage issue', 'Track complaint', 'Explain grievance']
      : ['Garbage issue', 'Track complaint', 'Grievance samjhao'],
    memory: nextMemory,
    intent: 'GREETING',
    action: 'suggest',
    meta: buildMeta(analysis),
  })
}

export function buildActionResponse(
  query: string,
  memory: AssistantContextMemory,
  analysis: AssistantIntentResult,
  options?: {
    isLoggedIn?: boolean
  },
) {
  const nextMemory = updateContextMemory({
    previous: memory,
    intent: 'ACTION',
    entities: analysis.entities,
    action:
      analysis.entities.actionTarget === 'tracking'
        ? 'track_complaint'
        : analysis.entities.actionTarget === 'auth'
          ? 'open_auth'
        : 'understand_issue',
    query,
    preferredLanguage: analysis.preferredLanguage,
  })
  const isLoggedIn = Boolean(options?.isLoggedIn)

  if (analysis.entities.actionTarget === 'auth') {
    return buildResponse({
      message: isEnglish(analysis.preferredLanguage)
        ? 'Login or sign up to access your dashboard and file complaints.'
        : 'Dashboard aur complaint file karne ke liye login ya sign up karo.',
      suggestions: isEnglish(analysis.preferredLanguage)
        ? ['Login', 'Track complaint']
        : ['Login', 'Complaint track karo'],
      actionButtons: [{ label: 'Go to Login', route: authRoute }],
      route: authRoute,
      action: 'suggest',
      memory: nextMemory,
      intent: 'ACTION',
      meta: buildMeta(analysis),
    })
  }

  if (analysis.entities.actionTarget === 'dashboard') {
    return buildResponse({
      message: isEnglish(analysis.preferredLanguage)
        ? isLoggedIn
          ? "You're all set. Open the dashboard to manage your complaint flow."
          : 'Login or sign up to access your dashboard and file complaints.'
        : isLoggedIn
          ? 'Aap ready ho. Complaint flow ke liye dashboard kholo.'
          : 'Dashboard aur complaint file karne ke liye login ya sign up karo.',
      suggestions: isEnglish(analysis.preferredLanguage)
        ? isLoggedIn
          ? ['Open dashboard', 'Track complaint']
          : ['Login', 'Track complaint']
        : isLoggedIn
          ? ['Dashboard kholo', 'Complaint track karo']
          : ['Login', 'Complaint track karo'],
      actionButtons: [
        {
          label: isLoggedIn ? 'Open Dashboard' : 'Go to Login',
          route: isLoggedIn ? complaintRoute : authRoute,
        },
      ],
      route: isLoggedIn ? complaintRoute : authRoute,
      action: 'suggest',
      memory: nextMemory,
      intent: 'ACTION',
      meta: buildMeta(analysis),
    })
  }

  if (analysis.entities.actionTarget === 'tracking') {
    return buildResponse({
      message: isEnglish(analysis.preferredLanguage)
        ? 'Use the tracker to check complaint status.'
        : 'Complaint status dekhne ke liye tracker kholo.',
      suggestions: isEnglish(analysis.preferredLanguage)
        ? ['Open tracker', 'Where is complaint ID?']
        : ['Tracker kholo', 'Complaint ID kahan milega?'],
      actionButtons: [{ label: 'Track Complaint', route: trackingRoute }],
      route: trackingRoute,
      action: 'suggest',
      memory: nextMemory,
      intent: 'ACTION',
      meta: buildMeta(analysis),
    })
  }

  return buildResponse({
    message: isEnglish(analysis.preferredLanguage)
      ? isLoggedIn
        ? "You're all set. Go to dashboard and click 'Raise Complaint'."
        : "To register a complaint, you need to login first. If you're new, please sign up."
      : isLoggedIn
        ? "Aap ready ho. Dashboard par jaake 'Raise Complaint' par click karo."
        : 'Complaint register karne ke liye pehle login karo. Naye ho to sign up kar lo.',
    suggestions: isEnglish(analysis.preferredLanguage)
      ? isLoggedIn
        ? ['Open dashboard', 'Track complaint']
        : ['Login', 'Track complaint']
      : isLoggedIn
        ? ['Dashboard kholo', 'Complaint track karo']
        : ['Login', 'Complaint track karo'],
    actionButtons: [
      {
        label: isLoggedIn ? 'Open Dashboard' : 'Login / Signup',
        route: isLoggedIn ? complaintRoute : authRoute,
      },
    ],
    route: isLoggedIn ? complaintRoute : authRoute,
    action: 'suggest',
    memory: nextMemory,
    intent: 'ACTION',
    meta: buildMeta(analysis),
  })
}

export function buildIssueResponse(
  query: string,
  memory: AssistantContextMemory,
  analysis: AssistantIntentResult,
  options?: {
    isLoggedIn?: boolean
  },
) {
  const topCategory = analysis.possibleCategories[0]
  const nextMemory = updateContextMemory({
    previous: memory,
    intent: 'ISSUE',
    entities: analysis.entities,
    action: 'confirm_issue',
    query,
    preferredLanguage: analysis.preferredLanguage,
  })

  const department = topCategory?.department || analysis.entities.department || ''
  const category = topCategory?.category || analysis.entities.category || ''
  const departmentLabel = formatPortalOnlyIssueDepartment(
    department,
    category,
    analysis.preferredLanguage,
  )

  const message = isEnglish(analysis.preferredLanguage)
    ? `${getLead(query, analysis.preferredLanguage, 'warm')} This looks like a ${departmentLabel} issue.\nWant me to help you report it?`
    : `${getLead(query, analysis.preferredLanguage, 'warm')} Yeh ${departmentLabel} issue lag raha hai.\nKya main report karne mein help karun?`

  return buildResponse({
    message,
    suggestions: isEnglish(analysis.preferredLanguage)
      ? ['Register complaint', 'Clarify issue']
      : ['Complaint register', 'Issue clarify karo'],
    actionButtons: [
      {
        label: 'Register Complaint',
        route: options?.isLoggedIn ? complaintRoute : authRoute,
      },
    ],
    action: 'suggest',
    memory: nextMemory,
    intent: 'ISSUE',
    meta: buildMeta(analysis, {
      category,
      department,
    }),
  })
}

export function buildClarificationResponse(
  query: string,
  memory: AssistantContextMemory,
  analysis: AssistantIntentResult,
  options?: {
    acknowledgeMistake?: boolean
  },
) {
  const nextMemory = updateContextMemory({
    previous: memory,
    intent: options?.acknowledgeMistake ? 'CORRECTION' : 'CLARIFICATION',
    entities: analysis.entities,
    action: 'clarify_issue',
    query,
    preferredLanguage: analysis.preferredLanguage,
  })

  const lead = options?.acknowledgeMistake
    ? `${getLead(query, analysis.preferredLanguage, 'correction')} Let me fix that.`
    : getLead(query, analysis.preferredLanguage, 'neutral')

  const choices = formatChoiceList(
    analysis.possibleCategories,
    analysis.preferredLanguage,
  )

  const message = !choices
    ? isEnglish(analysis.preferredLanguage)
      ? `${lead} Can you tell me a bit more about the issue?`
      : `${lead} Issue ke baare mein thoda aur bataoge?`
    : isEnglish(analysis.preferredLanguage)
      ? `${lead} Can you tell me a bit more about the issue?\nDo you mean ${choices}?`
      : `${lead} Issue ke baare mein thoda aur bataoge?\nKya ye ${choices} hai?`

  return buildResponse({
    message,
    suggestions: analysis.possibleCategories
      .slice(0, 3)
      .map((category) => titleCase(category.label)),
    action: 'respond',
    memory: nextMemory,
    intent: options?.acknowledgeMistake ? 'CORRECTION' : 'CLARIFICATION',
    meta: buildMeta(analysis),
  })
}

export function buildCorrectionResponse(
  query: string,
  memory: AssistantContextMemory,
  analysis: AssistantIntentResult,
  options?: {
    isLoggedIn?: boolean
  },
) {
  if (analysis.confidence < 0.6 || !analysis.possibleCategories[0]) {
    return buildClarificationResponse(query, memory, analysis, {
      acknowledgeMistake: true,
    })
  }

  const corrected = analysis.possibleCategories[0]
  const nextMemory = updateContextMemory({
    previous: memory,
    intent: 'CORRECTION',
    entities: {
      category: corrected.category,
      department: corrected.department,
      topic: corrected.label,
      actionTarget: 'complaint',
    },
    action: 'confirm_corrected_issue',
    query,
    preferredLanguage: analysis.preferredLanguage,
  })

  const departmentLabel = formatPortalOnlyIssueDepartment(
    corrected.department,
    corrected.category,
    analysis.preferredLanguage,
  )

  const message = isEnglish(analysis.preferredLanguage)
    ? `${getLead(query, analysis.preferredLanguage, 'correction')} Let me fix that.\nThis looks more like a ${departmentLabel} issue.`
    : `${getLead(query, analysis.preferredLanguage, 'correction')} Let me fix that.\nYeh zyada ${departmentLabel} issue lag raha hai.`

  return buildResponse({
    message,
    suggestions: isEnglish(analysis.preferredLanguage)
      ? ['Register complaint', 'Clarify more']
      : ['Complaint register', 'Aur clarify karo'],
    actionButtons: [
      {
        label: 'Register Complaint',
        route: options?.isLoggedIn ? complaintRoute : authRoute,
      },
    ],
    action: 'suggest',
    memory: nextMemory,
    intent: 'CORRECTION',
    meta: buildMeta(analysis, {
      category: corrected.category,
      department: corrected.department,
    }),
  })
}

export function buildFollowUpResponse(
  query: string,
  memory: AssistantContextMemory,
  analysis: AssistantIntentResult,
) {
  const topic = analysis.entities.topic || memory.lastTopic || 'complaint'
  const nextMemory = updateContextMemory({
    previous: memory,
    intent: 'FOLLOWUP',
    entities: { ...analysis.entities, topic },
    action: memory.lastAction || 'followup',
    query,
    preferredLanguage: analysis.preferredLanguage,
  })

  if (memory.lastAction === 'track_complaint' || topic === 'tracking') {
    return buildResponse({
      message: isEnglish(analysis.preferredLanguage)
        ? 'After that, you can check the complaint ID in the tracker and follow each status update there.'
        : 'Uske baad aap tracker mein complaint ID daal kar har status update dekh sakte ho.',
      suggestions: isEnglish(analysis.preferredLanguage)
        ? ['Open tracker', 'Where is complaint ID?']
        : ['Tracker kholo', 'Complaint ID kahan milega?'],
      actionButtons: [{ label: 'Open Tracker', route: trackingRoute }],
      route: trackingRoute,
      action: 'suggest',
      memory: nextMemory,
      intent: 'FOLLOWUP',
      meta: buildMeta(analysis),
    })
  }

  return buildResponse({
    message: isEnglish(analysis.preferredLanguage)
      ? 'After submission, the relevant department reviews it, assigns it, and updates progress in the tracker.'
      : 'Complaint ke baad relevant department usse review karta hai, assign karta hai, aur tracker mein progress update hoti rehti hai.',
    suggestions: isEnglish(analysis.preferredLanguage)
      ? ['Track complaint', 'Explain the process']
      : ['Track complaint', 'Process samjhao'],
    action: 'respond',
    memory: nextMemory,
    intent: 'FOLLOWUP',
    meta: buildMeta(analysis),
  })
}

export function buildRestrictedResponse(
  memory: AssistantContextMemory,
  preferredLanguage: PreferredLanguage,
) {
  const nextMemory = updateContextMemory({
    previous: memory,
    intent: 'ACTION',
    entities: { topic: 'restricted' },
    action: 'restricted',
    preferredLanguage,
  })

  return buildResponse({
    message: isEnglish(preferredLanguage)
      ? 'This section is restricted. I can help only with citizen services here.'
      : 'Yeh section restricted hai. Main yahan sirf citizen services mein help kar sakta hoon.',
    suggestions: isEnglish(preferredLanguage)
      ? ['Register complaint', 'Track complaint']
      : ['Complaint register', 'Complaint track'],
    action: 'respond',
    memory: nextMemory,
    intent: 'ACTION',
    meta: {
      preferredLanguage,
    },
  })
}

export function buildComplaintTrackingResponse(input: {
  complaintId: string
  status: string
  department: string
  lastUpdated: string
  currentStage?: string
  expectedResolution?: string
  detailRoute: string
  memory: AssistantContextMemory
  preferredLanguage: PreferredLanguage
}) {
  const nextMemory = updateContextMemory({
    previous: input.memory,
    intent: 'ACTION',
    entities: {
      topic: 'tracking',
      actionTarget: 'tracking',
    },
    action: 'track_complaint',
    query: input.complaintId,
    preferredLanguage: input.preferredLanguage,
  })

  const message = isEnglish(input.preferredLanguage)
    ? [
        `Complaint Status: ${input.status}`,
        `Department: ${input.department}`,
        input.currentStage
          ? `Last Update: ${input.currentStage}`
          : `Last Update: ${input.lastUpdated}`,
        input.expectedResolution ? `Expected Resolution: ${input.expectedResolution}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : [
        `Complaint Status: ${input.status}`,
        `Department: ${input.department}`,
        input.currentStage ? `Last Update: ${input.currentStage}` : `Last Update: ${input.lastUpdated}`,
        input.expectedResolution ? `Expected Resolution: ${input.expectedResolution}` : '',
      ]
        .filter(Boolean)
        .join('\n')

  return buildResponse({
    message,
    actionButtons: [{ label: 'View Full Details', route: input.detailRoute }],
    action: 'suggest',
    route: input.detailRoute,
    memory: nextMemory,
    intent: 'ACTION',
    meta: {
      complaintId: input.complaintId,
      department: input.department,
      currentStage: input.currentStage,
      lastUpdated: input.lastUpdated,
      expectedResolution: input.expectedResolution,
      preferredLanguage: input.preferredLanguage,
    },
  })
}

export function buildComplaintTrackingNotFoundResponse(input: {
  complaintId: string
  memory: AssistantContextMemory
  preferredLanguage: PreferredLanguage
}) {
  const nextMemory = updateContextMemory({
    previous: input.memory,
    intent: 'ACTION',
    entities: {
      topic: 'tracking',
      actionTarget: 'tracking',
    },
    action: 'track_complaint',
    query: input.complaintId,
    preferredLanguage: input.preferredLanguage,
  })

  return buildResponse({
    message: isEnglish(input.preferredLanguage)
      ? `I could not find complaint ID ${input.complaintId}. Please check the ID and try again.`
      : `Complaint ID ${input.complaintId} nahi mila. Ek baar ID check karke phir try karo.`,
    suggestions: isEnglish(input.preferredLanguage)
      ? ['Open tracker', 'Login / Register']
      : ['Tracker kholo', 'Login / Register'],
    actionButtons: [{ label: 'Open Tracker', route: trackingRoute }],
    route: trackingRoute,
    action: 'suggest',
    memory: nextMemory,
    intent: 'ACTION',
    meta: {
      complaintId: input.complaintId,
      preferredLanguage: input.preferredLanguage,
    },
  })
}

export function buildOutOfScopeResponse(
  query: string,
  memory: AssistantContextMemory,
  analysis: AssistantIntentResult,
) {
  const nextMemory = updateContextMemory({
    previous: memory,
    intent: 'OUT_OF_SCOPE',
    entities: { topic: 'out_of_scope' },
    action: 'blocked',
    query,
    preferredLanguage: analysis.preferredLanguage,
  })

  return buildResponse({
    message: isEnglish(analysis.preferredLanguage)
      ? 'I can help only with complaint and tracking services of this portal.'
      : 'Main sirf is portal ki complaint aur tracking services mein help kar sakta hoon.',
    suggestions: isEnglish(analysis.preferredLanguage)
      ? ['Register complaint', 'Track complaint', 'Login / Register']
      : ['Complaint register', 'Complaint track', 'Login / Register'],
    action: 'respond',
    memory: nextMemory,
    intent: 'OUT_OF_SCOPE',
    meta: buildMeta(analysis),
  })
}

export function buildExplanationFallbackResponse(input: {
  query: string
  memory: AssistantContextMemory
  analysis: AssistantIntentResult
}) {
  const nextMemory = updateContextMemory({
    previous: input.memory,
    intent: 'EXPLANATION',
    entities: input.analysis.entities,
    action: 'explain',
    query: input.query,
    preferredLanguage: input.analysis.preferredLanguage,
  })

  const message = isEnglish(input.analysis.preferredLanguage)
    ? 'Ask the exact portal-related question in one line and I will keep it short.'
    : 'Portal se related exact sawaal ek line mein bhejo, main short answer dunga.'

  return buildResponse({
    message,
    action: 'respond',
    memory: nextMemory,
    intent: 'EXPLANATION',
    meta: buildMeta(input.analysis),
  })
}

export function buildExplanationGeminiResponse(input: {
  reply: string
  query: string
  memory: AssistantContextMemory
  analysis: AssistantIntentResult
}) {
  const nextMemory = updateContextMemory({
    previous: input.memory,
    intent: 'EXPLANATION',
    entities: input.analysis.entities,
    action: 'explain',
    query: input.query,
    preferredLanguage: input.analysis.preferredLanguage,
  })

  return buildResponse({
    message: input.reply.trim(),
    action: 'respond',
    memory: nextMemory,
    intent: 'EXPLANATION',
    meta: buildMeta(input.analysis),
  })
}
