import type { AssistantContextMemory } from '../types'
import { normalizeAssistantMemory } from './context-memory'
import {
  detectAssistantIntent,
  isRestricted,
  normalizeText,
  detectPreferredLanguage,
} from './intent-detector'
import {
  buildActionResponse,
  buildClarificationResponse,
  buildOutOfScopeResponse,
  buildCorrectionResponse,
  buildFollowUpResponse,
  buildGreetingResponse,
  buildIssueResponse,
  buildRestrictedResponse,
} from './response-builder'

export function resolveCitizenAssistantQuery(
  query: string,
  rawMemory?: Partial<AssistantContextMemory> | null,
  options?: {
    isLoggedIn?: boolean
  },
) {
  const memory = normalizeAssistantMemory(rawMemory)
  const normalizedQuery = normalizeText(query)

  if (!normalizedQuery) {
    return null
  }

  if (isRestricted(query)) {
    return buildRestrictedResponse(memory, detectPreferredLanguage(query, memory))
  }

  const intentResult = detectAssistantIntent(query, memory)

  if (intentResult.intent === 'GREETING') {
    return buildGreetingResponse(query, memory, intentResult)
  }

  if (intentResult.intent === 'FOLLOWUP') {
    return buildFollowUpResponse(query, memory, intentResult)
  }

  if (intentResult.intent === 'CORRECTION') {
    return buildCorrectionResponse(query, memory, intentResult, options)
  }

  if (intentResult.intent === 'CLARIFICATION') {
    return buildClarificationResponse(query, memory, intentResult)
  }

  if (intentResult.intent === 'ISSUE') {
    return buildIssueResponse(query, memory, intentResult, options)
  }

  if (intentResult.intent === 'ACTION') {
    return buildActionResponse(query, memory, intentResult, options)
  }

  if (intentResult.intent === 'OUT_OF_SCOPE') {
    return buildOutOfScopeResponse(query, memory, intentResult)
  }

  return null
}
