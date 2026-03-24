import type {
  AgentIntentType,
  AssistantContextMemory,
  AssistantIntentEntities,
  PreferredLanguage,
} from '../types'

export const EMPTY_ASSISTANT_MEMORY: AssistantContextMemory = {
  lastIntent: '',
  lastDepartment: '',
  lastAction: '',
  lastTopic: '',
  lastCategory: '',
  lastUserQuery: '',
  preferredLanguage: 'english',
}

export function normalizeAssistantMemory(
  memory?: Partial<AssistantContextMemory> | null,
): AssistantContextMemory {
  return {
    lastIntent: memory?.lastIntent || '',
    lastDepartment: memory?.lastDepartment || '',
    lastAction: memory?.lastAction || '',
    lastTopic: memory?.lastTopic || '',
    lastCategory: memory?.lastCategory || '',
    lastUserQuery: memory?.lastUserQuery || '',
    preferredLanguage: memory?.preferredLanguage || 'english',
  }
}

export function updateContextMemory(input: {
  previous: AssistantContextMemory
  intent: AgentIntentType
  entities: AssistantIntentEntities
  action?: string
  query?: string
  preferredLanguage?: PreferredLanguage
}) {
  return {
    lastIntent: input.intent,
    lastDepartment:
      input.entities.department || input.previous.lastDepartment,
    lastAction: input.action || input.previous.lastAction,
    lastTopic: input.entities.topic || input.previous.lastTopic,
    lastCategory: input.entities.category || input.previous.lastCategory,
    lastUserQuery: input.query || input.previous.lastUserQuery,
    preferredLanguage:
      input.preferredLanguage || input.previous.preferredLanguage,
  } satisfies AssistantContextMemory
}
