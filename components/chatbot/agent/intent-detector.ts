import type {
  AssistantContextMemory,
  AssistantIntentEntities,
  AssistantIntentResult,
  PossibleCategory,
  PreferredLanguage,
} from '../types'
import { EMPTY_ASSISTANT_MEMORY } from './context-memory'
import {
  listMappedCategories,
  listMappedDepartments,
} from '../../../lib/grievance-mapping'

type MappingDepartment = ReturnType<typeof listMappedDepartments>[number]
type MappingCategory = ReturnType<typeof listMappedCategories>[number]

export type IssueMatch = {
  category: MappingCategory
  department: MappingDepartment
}

type RankedIssueCategory = PossibleCategory & {
  score: number
}

const departments = listMappedDepartments()
const categories = listMappedCategories()
const departmentById = new Map(
  departments.map((department) => [department.id, department]),
)

const RESTRICTED_ROUTES = [
  '/admin',
  '/l1',
  '/l2',
  '/l3',
  '/leader',
  '/worker',
  '/worker-login',
] as const

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'do',
  'for',
  'hai',
  'haii',
  'help',
  'i',
  'is',
  'issue',
  'kar',
  'karna',
  'kare',
  'ka',
  'kaise',
  'ke',
  'ki',
  'ko',
  'koi',
  'kya',
  'me',
  'mera',
  'meri',
  'mujhe',
  'my',
  'of',
  'on',
  'please',
  'problem',
  'report',
  'this',
  'to',
])

const TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bshikayat\b/g, ' complaint '],
  [/\bcomplain\b/g, ' complaint '],
  [/\bcomplaint\b/g, ' complaint '],
  [/\btrack\b/g, ' track '],
  [/\bstatus\b/g, ' track '],
  [/\btracking\b/g, ' track '],
  [/\btracker\b/g, ' track '],
  [/\bkaise\b/g, ' how '],
  [/\bkaha\b/g, ' where '],
  [/\bpani\b/g, ' water '],
  [/\bjal\b/g, ' water '],
  [/\bkooda\b/g, ' garbage '],
  [/\bkachra\b/g, ' garbage '],
  [/\bsafai\b/g, ' cleanliness '],
  [/\bnaali\b/g, ' drain '],
  [/\bnali\b/g, ' drain '],
  [/\bpothole\b/g, ' road '],
  [/\bsadak\b/g, ' road '],
  [/\bbijli\b/g, ' electrical '],
  [/\blight\b/g, ' street light '],
  [/\bparked\b/g, ' parking '],
  [/\bkutta\b/g, ' dog '],
  [/\bbakri\b/g, ' goat '],
  [/\bgaay\b/g, ' cow '],
  [/\bgai\b/g, ' cow '],
  [/\bjanwar\b/g, ' animal '],
  [/\bmar gaya\b/g, ' dead '],
  [/\bmara gaya\b/g, ' dead '],
  [/\bmaar gaya\b/g, ' dead '],
  [/\buske baad\b/g, ' after that '],
  [/\bbaad mein\b/g, ' after that '],
  [/\bgrievance\b/g, ' grievance '],
]

const GREETING_KEYWORDS = ['hi', 'hello', 'hey', 'namaste']
const FOLLOW_UP_KEYWORDS = ['after that', 'next', 'phir kya', 'uske baad', 'baad kya', 'then what']
const EXPLANATION_KEYWORDS = ['what', 'why', 'how', 'meaning', 'matlab', 'kya hota', 'kaise kaam', 'explain']
const TRACKING_KEYWORDS = ['track', 'tracking id', 'complaint id', 'reference number', 'status', 'timeline', 'progress']
const AUTH_KEYWORDS = ['login', 'log in', 'sign in', 'signin', 'register', 'sign up', 'signup', 'auth']
const DASHBOARD_KEYWORDS = ['dashboard', 'citizen dashboard']
const COMPLAINT_ACTION_KEYWORDS = [
  'complaint',
  'file',
  'lodge',
  'report',
  'submit',
  'register complaint',
  'complaint karna',
  'complaint kar sakte',
]
const PORTAL_SCOPE_KEYWORDS = [
  'complaint',
  'grievance',
  'track',
  'tracking',
  'status',
  'dashboard',
  'login',
  'register',
  'portal',
  'citizen',
  'department',
  'category',
  'ward',
  'issue',
  'feedback',
  'proof',
  'timeline',
  'complaint id',
  'tracking id',
]
const ISSUE_HINT_KEYWORDS = [
  'garbage',
  'waste',
  'trash',
  'cleanliness',
  'street light',
  'light',
  'electrical',
  'water',
  'drain',
  'road',
  'parking',
  'animal',
  'dog',
  'cow',
  'goat',
  'dead',
  'injured',
]
const HINGLISH_MARKERS = [
  'kya',
  'kaise',
  'mera',
  'meri',
  'mujhe',
  'nahi',
  'haan',
  'acha',
  'theek',
  'karna',
  'karni',
  'kar do',
  'batao',
  'samjhao',
  'lag raha',
  'uske baad',
]
const ENGLISH_MARKERS = [
  'what',
  'why',
  'how',
  'please',
  'explain',
  'report',
  'track',
  'status',
  'complaint',
  'issue',
]
const CORRECTION_KEYWORDS = [
  'wrong',
  'incorrect',
  'galat',
  'not this',
  'not parking',
  'ye nahi',
  'how is this',
  'why this',
  'ye kaise',
  'aisa kaise',
]
const AMBIGUOUS_CONTEXT_KEYWORDS = ['accident', 'hit', 'crash', 'dead', 'injured', 'danger']
const COMPLAINT_ID_PATTERN = /(?:[A-Z]{2,}-?\d{4,}|\d{5,})/i

const COMMON_ISSUE_MATCHERS: Array<{
  keywords: string[]
  categoryName: string
}> = [
  {
    keywords: ['garbage', 'waste', 'trash', 'cleanliness'],
    categoryName: 'Garbage Dumps',
  },
  {
    keywords: ['street light', 'electrical', 'power'],
    categoryName: 'High Mast / Street Lights Not Working',
  },
  {
    keywords: ['water', 'drain', 'sewer', 'overflow', 'waterlogging'],
    categoryName: 'Sewerage / Storm Water Overflow',
  },
  {
    keywords: ['road', 'footpath', 'resurfacing'],
    categoryName: 'Road / Footpath Resurfacing',
  },
  {
    keywords: ['parking'],
    categoryName: 'Unauthorized / Illegal Parking',
  },
  {
    keywords: ['tree', 'park', 'grass', 'plants'],
    categoryName: 'Maintenance of Park',
  },
  {
    keywords: ['dog', 'stray dog'],
    categoryName: 'Catching of Stray Dogs',
  },
  {
    keywords: ['animal', 'cow', 'goat', 'cattle', 'monkey'],
    categoryName: 'Stray Cattle',
  },
  {
    keywords: ['dead animal', 'dead', 'carcass'],
    categoryName: 'Removal of Dead Animal',
  },
  {
    keywords: ['injured animal', 'injured', 'hurt animal', 'sick animal'],
    categoryName: 'Injured / Sick Animal',
  },
]

const issueCategoryByName = new Map(
  categories.map((category) => [category.name, category]),
)

export function normalizeText(value: string) {
  let normalized = value.toLowerCase()

  for (const [pattern, replacement] of TEXT_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement)
  }

  return normalized
    .replace(/[^\w\s/()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token && !STOP_WORDS.has(token))
}

export function includesPhrase(query: string, phrase: string) {
  return normalizeText(query).includes(normalizeText(phrase))
}

export function extractComplaintReference(query: string) {
  const match = query.trim().match(COMPLAINT_ID_PATTERN)
  return match?.[0]?.trim() || ''
}

function hasAnyKeyword(query: string, keywords: string[]) {
  return keywords.some((keyword) => includesPhrase(query, keyword))
}

function clampConfidence(value: number) {
  return Math.max(0.2, Math.min(0.98, Number(value.toFixed(2))))
}

function buildCategorySignals(category: MappingCategory, department: MappingDepartment) {
  const signals = new Set([
    ...tokenize(category.name),
    ...tokenize(department.name),
  ])

  const normalizedCategory = normalizeText(category.name)
  const normalizedDepartment = normalizeText(department.name)

  if (
    normalizedCategory.includes('garbage') ||
    normalizedCategory.includes('dustbin') ||
    normalizedCategory.includes('sweeping')
  ) {
    signals.add('garbage')
    signals.add('waste')
    signals.add('cleanliness')
    signals.add('sanitation')
  }

  if (
    normalizedCategory.includes('water') ||
    normalizedCategory.includes('drain') ||
    normalizedCategory.includes('manhole') ||
    normalizedCategory.includes('sewer')
  ) {
    signals.add('water')
    signals.add('drain')
    signals.add('overflow')
  }

  if (
    normalizedCategory.includes('street') ||
    normalizedCategory.includes('light') ||
    normalizedDepartment.includes('electrical')
  ) {
    signals.add('electrical')
    signals.add('street')
    signals.add('light')
  }

  if (
    normalizedCategory.includes('road') ||
    normalizedCategory.includes('footpath') ||
    normalizedCategory.includes('speed breaker')
  ) {
    signals.add('road')
    signals.add('footpath')
  }

  if (
    normalizedCategory.includes('parking') ||
    normalizedCategory.includes('encroachment')
  ) {
    signals.add('parking')
    signals.add('encroachment')
  }

  if (
    normalizedCategory.includes('park') ||
    normalizedCategory.includes('tree') ||
    normalizedCategory.includes('grass') ||
    normalizedDepartment.includes('horticulture')
  ) {
    signals.add('park')
    signals.add('tree')
    signals.add('grass')
  }

  if (
    normalizedCategory.includes('dog') ||
    normalizedCategory.includes('animal') ||
    normalizedCategory.includes('cattle') ||
    normalizedCategory.includes('dead animal') ||
    normalizedCategory.includes('injured') ||
    normalizedDepartment.includes('veterinary')
  ) {
    signals.add('animal')
    signals.add('dog')
    signals.add('cattle')
    signals.add('cow')
    signals.add('goat')
    signals.add('dead')
    signals.add('injured')
  }

  return signals
}

function describeCategory(
  categoryName: string,
  departmentName: string,
  preferredLanguage: PreferredLanguage,
) {
  const normalizedCategory = normalizeText(categoryName)

  if (normalizedCategory.includes('dead animal')) {
    return preferredLanguage === 'english'
      ? 'a dead animal issue'
      : 'dead animal wala issue'
  }

  if (normalizedCategory.includes('injured') || normalizedCategory.includes('sick animal')) {
    return preferredLanguage === 'english'
      ? 'an injured animal issue'
      : 'injured animal wala issue'
  }

  if (
    normalizedCategory.includes('dog') ||
    normalizedCategory.includes('cattle') ||
    departmentName.toLowerCase().includes('veterinary')
  ) {
    return preferredLanguage === 'english'
      ? 'a stray animal issue'
      : 'stray animal wala issue'
  }

  if (normalizedCategory.includes('garbage') || departmentName.toLowerCase().includes('cleanliness')) {
    return preferredLanguage === 'english'
      ? 'a sanitation issue'
      : 'sanitation wala issue'
  }

  if (normalizedCategory.includes('water') || normalizedCategory.includes('drain')) {
    return preferredLanguage === 'english'
      ? 'a water or drain issue'
      : 'water ya drain wala issue'
  }

  if (normalizedCategory.includes('light') || departmentName.toLowerCase().includes('electrical')) {
    return preferredLanguage === 'english'
      ? 'a street light issue'
      : 'street light wala issue'
  }

  if (normalizedCategory.includes('road') || normalizedCategory.includes('footpath')) {
    return preferredLanguage === 'english'
      ? 'a road issue'
      : 'road wala issue'
  }

  if (normalizedCategory.includes('parking')) {
    return preferredLanguage === 'english'
      ? 'a parking issue'
      : 'parking wala issue'
  }

  return preferredLanguage === 'english'
    ? `${departmentName.toLowerCase()} issue`
    : `${departmentName} ka issue`
}

function buildIssueConfidence(
  score: number,
  secondScore: number,
  queryTokens: string[],
  normalizedQuery: string,
) {
  let confidence = 0.42

  if (score >= 14) {
    confidence = 0.9
  } else if (score >= 10) {
    confidence = 0.8
  } else if (score >= 7) {
    confidence = 0.68
  } else if (score >= 5) {
    confidence = 0.58
  }

  if (secondScore && score - secondScore < 2) {
    confidence -= 0.12
  }

  if (queryTokens.length <= 2) {
    confidence -= 0.05
  }

  if (
    hasAnyKeyword(normalizedQuery, ['animal', 'cow', 'goat', 'dog']) &&
    hasAnyKeyword(normalizedQuery, AMBIGUOUS_CONTEXT_KEYWORDS)
  ) {
    confidence -= 0.12
  }

  return clampConfidence(confidence)
}

function rankIssueCategories(
  query: string,
  preferredLanguage: PreferredLanguage,
): RankedIssueCategory[] {
  const normalizedQuery = normalizeText(query)
  const queryTokens = tokenize(query)

  if (!normalizedQuery) {
    return []
  }

  const ranked = categories
    .map((category) => {
      const department = departmentById.get(category.department_id)

      if (!department) {
        return null
      }

      const signals = buildCategorySignals(category, department)
      let score = 0

      if (includesPhrase(normalizedQuery, category.name)) {
        score += 12
      }

      if (includesPhrase(normalizedQuery, department.name)) {
        score += 5
      }

      for (const matcher of COMMON_ISSUE_MATCHERS) {
        if (
          matcher.categoryName === category.name &&
          matcher.keywords.some((keyword) => includesPhrase(normalizedQuery, keyword))
        ) {
          score += 7
        }
      }

      for (const token of queryTokens) {
        if (signals.has(token)) {
          score += 2
        }
      }

      if (
        category.name === 'Removal of Dead Animal' &&
        hasAnyKeyword(normalizedQuery, ['dead', 'carcass', 'body', 'killed'])
      ) {
        score += 6
      }

      if (
        category.name === 'Injured / Sick Animal' &&
        hasAnyKeyword(normalizedQuery, ['injured', 'hurt', 'sick'])
      ) {
        score += 6
      }

      if (
        category.name === 'Stray Cattle' &&
        hasAnyKeyword(normalizedQuery, ['animal', 'goat', 'cow', 'stray'])
      ) {
        score += 5
      }

      if (
        category.name === 'Catching of Stray Dogs' &&
        hasAnyKeyword(normalizedQuery, ['dog', 'stray dog'])
      ) {
        score += 5
      }

      if (score < 3) {
        return null
      }

      return {
        category: category.name,
        department: department.name,
        confidence: 0,
        label: describeCategory(category.name, department.name, preferredLanguage),
        score,
      } satisfies RankedIssueCategory
    })
    .filter((item): item is RankedIssueCategory => Boolean(item))
    .sort((left, right) => right.score - left.score)

  if (!ranked.length) {
    return []
  }

  const secondScore = ranked[1]?.score || 0

  return ranked.slice(0, 3).map((item, index) => {
    const confidence = buildIssueConfidence(
      item.score,
      index === 0 ? secondScore : 0,
      queryTokens,
      normalizedQuery,
    )

    return {
      ...item,
      confidence: index === 0
        ? confidence
        : clampConfidence(confidence - 0.12 - index * 0.05),
    }
  })
}

function toIssueEntities(candidate?: PossibleCategory) {
  if (!candidate) {
    return {} satisfies AssistantIntentEntities
  }

  return {
    category: candidate.category,
    department: candidate.department,
    topic: candidate.label,
  } satisfies AssistantIntentEntities
}

export function detectPreferredLanguage(
  query: string,
  memory: AssistantContextMemory = EMPTY_ASSISTANT_MEMORY,
) {
  const normalizedQuery = normalizeText(query)
  const hinglishHits = HINGLISH_MARKERS.filter((keyword) =>
    includesPhrase(normalizedQuery, keyword),
  ).length
  const englishHits = ENGLISH_MARKERS.filter((keyword) =>
    includesPhrase(normalizedQuery, keyword),
  ).length

  if (hinglishHits > englishHits) {
    return 'hinglish' satisfies PreferredLanguage
  }

  if (englishHits > 0) {
    return 'english' satisfies PreferredLanguage
  }

  return memory.preferredLanguage || ('english' satisfies PreferredLanguage)
}

export function isPortalScopedQuery(query: string) {
  const normalizedQuery = normalizeText(query)

  return (
    Boolean(extractComplaintReference(query)) ||
    hasAnyKeyword(normalizedQuery, PORTAL_SCOPE_KEYWORDS) ||
    hasAnyKeyword(normalizedQuery, ISSUE_HINT_KEYWORDS) ||
    hasAnyKeyword(normalizedQuery, ['water', 'garbage', 'road', 'drain', 'light', 'animal'])
  )
}

function isCorrectionQuery(
  query: string,
  memory: AssistantContextMemory,
) {
  const normalizedQuery = normalizeText(query)

  if (!memory.lastCategory && !memory.lastDepartment) {
    return false
  }

  const mentionsPreviousMapping =
    (memory.lastCategory && includesPhrase(normalizedQuery, memory.lastCategory)) ||
    (memory.lastDepartment && includesPhrase(normalizedQuery, memory.lastDepartment))

  return (
    hasAnyKeyword(normalizedQuery, CORRECTION_KEYWORDS) ||
    (mentionsPreviousMapping &&
      (includesPhrase(normalizedQuery, 'how') || includesPhrase(normalizedQuery, 'why')))
  )
}

export function isRestricted(query: string) {
  const blocked = [
    'admin',
    'officer',
    'l1',
    'l2',
    'l3',
    'leader',
    'worker',
    'login panel',
    'backend',
    'backend access',
  ]

  const normalizedQuery = query.toLowerCase()

  return (
    blocked.some((word) => normalizedQuery.includes(word)) ||
    RESTRICTED_ROUTES.some((route) => normalizedQuery.includes(route))
  )
}

export function findCitizenIssueCandidates(
  query: string,
  preferredLanguage: PreferredLanguage = 'english',
) {
  return rankIssueCategories(query, preferredLanguage)
}

export function findCitizenIssueMatch(query: string) {
  const preferredLanguage = detectPreferredLanguage(query)
  const candidate = rankIssueCategories(query, preferredLanguage)[0]

  if (!candidate || candidate.confidence < 0.6) {
    return null
  }

  const category = issueCategoryByName.get(candidate.category)

  if (!category) {
    return null
  }

  const department = departmentById.get(category.department_id)

  if (!department) {
    return null
  }

  return {
    category,
    department,
  }
}

export function detectAssistantIntent(
  query: string,
  memory: AssistantContextMemory = EMPTY_ASSISTANT_MEMORY,
): AssistantIntentResult {
  const normalizedQuery = normalizeText(query)
  const preferredLanguage = detectPreferredLanguage(query, memory)
  const possibleCategories = rankIssueCategories(query, preferredLanguage)
  const strongestCategory = possibleCategories[0]
  const issueEntities = toIssueEntities(strongestCategory)
  const entities: AssistantIntentEntities = { ...issueEntities }

  if (hasAnyKeyword(normalizedQuery, TRACKING_KEYWORDS)) {
    entities.actionTarget = 'tracking'
    entities.topic = entities.topic || 'tracking'
  }

  if (hasAnyKeyword(normalizedQuery, AUTH_KEYWORDS)) {
    entities.actionTarget = 'auth'
    entities.topic = entities.topic || 'auth'
  }

  if (hasAnyKeyword(normalizedQuery, DASHBOARD_KEYWORDS)) {
    entities.actionTarget = 'dashboard'
    entities.topic = entities.topic || 'dashboard'
  }

  if (hasAnyKeyword(normalizedQuery, COMPLAINT_ACTION_KEYWORDS)) {
    entities.actionTarget = 'complaint'
    entities.topic = entities.topic || 'complaint'
  }

  if (hasAnyKeyword(normalizedQuery, GREETING_KEYWORDS) && normalizedQuery.split(' ').length <= 4) {
    return {
      intent: 'GREETING',
      confidence: 0.97,
      possibleCategories,
      entities,
      preferredLanguage,
    }
  }

  if (isCorrectionQuery(query, memory)) {
    const correctionSource = memory.lastUserQuery || query
    const correctionCandidates = rankIssueCategories(
      correctionSource,
      preferredLanguage,
    ).filter((candidate) => candidate.category !== memory.lastCategory)
    const correctionEntities = toIssueEntities(correctionCandidates[0])

    return {
      intent: 'CORRECTION',
      confidence: correctionCandidates[0]?.confidence || 0.45,
      possibleCategories: correctionCandidates.length
        ? correctionCandidates
        : possibleCategories,
      entities: {
        ...entities,
        ...correctionEntities,
      },
      preferredLanguage,
    }
  }

  if (
    hasAnyKeyword(normalizedQuery, FOLLOW_UP_KEYWORDS) ||
    ((normalizedQuery.includes('after') || normalizedQuery.includes('next')) &&
      Boolean(memory.lastIntent || memory.lastAction))
  ) {
    return {
      intent: 'FOLLOWUP',
      confidence: 0.86,
      possibleCategories,
      entities: {
        ...entities,
        topic: entities.topic || memory.lastTopic || 'complaint',
      },
      preferredLanguage,
    }
  }

  if (
    hasAnyKeyword(normalizedQuery, EXPLANATION_KEYWORDS) &&
    isPortalScopedQuery(query) &&
    !hasAnyKeyword(normalizedQuery, COMPLAINT_ACTION_KEYWORDS) &&
    !hasAnyKeyword(normalizedQuery, TRACKING_KEYWORDS) &&
    (!strongestCategory || strongestCategory.confidence < 0.7)
  ) {
    return {
      intent: 'EXPLANATION',
      confidence: 0.88,
      possibleCategories,
      entities: {
        ...entities,
        topic: entities.topic || memory.lastTopic || 'citizen services',
      },
      preferredLanguage,
    }
  }

  if (strongestCategory?.confidence >= 0.6) {
    return {
      intent: 'ISSUE',
      confidence: strongestCategory.confidence,
      possibleCategories,
      entities: {
        ...entities,
        actionTarget: entities.actionTarget || 'complaint',
      },
      preferredLanguage,
    }
  }

  if (
    strongestCategory ||
    hasAnyKeyword(normalizedQuery, ISSUE_HINT_KEYWORDS) ||
    hasAnyKeyword(normalizedQuery, AMBIGUOUS_CONTEXT_KEYWORDS)
  ) {
    return {
      intent: 'CLARIFICATION',
      confidence: strongestCategory?.confidence || 0.38,
      possibleCategories,
      entities: {
        ...entities,
        actionTarget: entities.actionTarget,
      },
      preferredLanguage,
    }
  }

  if (
    hasAnyKeyword(normalizedQuery, COMPLAINT_ACTION_KEYWORDS) ||
    hasAnyKeyword(normalizedQuery, TRACKING_KEYWORDS) ||
    hasAnyKeyword(normalizedQuery, AUTH_KEYWORDS) ||
    hasAnyKeyword(normalizedQuery, DASHBOARD_KEYWORDS)
  ) {
    return {
      intent: 'ACTION',
      confidence:
        entities.actionTarget === 'tracking'
          ? 0.84
          : entities.actionTarget === 'auth' || entities.actionTarget === 'dashboard'
            ? 0.9
            : 0.74,
      possibleCategories,
      entities,
      preferredLanguage,
    }
  }

  if (normalizedQuery.includes('grievance')) {
    return {
      intent: 'EXPLANATION',
      confidence: 0.86,
      possibleCategories,
      entities: {
        ...entities,
        topic: entities.topic || 'grievance',
      },
      preferredLanguage,
    }
  }

  if (!isPortalScopedQuery(query)) {
    return {
      intent: 'OUT_OF_SCOPE',
      confidence: 0.95,
      possibleCategories: [],
      entities: {
        topic: 'out_of_scope',
      },
      preferredLanguage,
    }
  }

  return {
    intent: 'EXPLANATION',
    confidence: 0.7,
    possibleCategories,
    entities: {
      ...entities,
      topic: entities.topic || memory.lastTopic || 'citizen services',
    },
    preferredLanguage,
  }
}
