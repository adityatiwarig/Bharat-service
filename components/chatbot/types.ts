import type * as React from 'react'

export type AssistantActionKey =
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

export type AssistantAction = {
  key: AssistantActionKey
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

export type ChatMessage = {
  id: string
  sender: 'bot' | 'user'
  text: string
  actions?: AssistantAction[]
  suggestions?: string[]
  actionButtons?: AssistantActionButton[]
  variant?: 'default' | 'highlight'
}

export type AssistantIntent = {
  id: string
  keywords: string[]
  minScore?: number
  response: (context: { isCitizenArea: boolean }) => string
  actions?: AssistantAction[]
}

export type AgentIntentType =
  | 'GREETING'
  | 'ACTION'
  | 'EXPLANATION'
  | 'ISSUE'
  | 'FOLLOWUP'
  | 'CLARIFICATION'
  | 'CORRECTION'
  | 'OUT_OF_SCOPE'

export type PreferredLanguage = 'english' | 'hinglish'

export type AssistantIntentEntities = {
  category?: string
  department?: string
  actionTarget?: 'complaint' | 'tracking' | 'auth' | 'dashboard'
  topic?: string
}

export type PossibleCategory = {
  category: string
  department: string
  confidence: number
  label: string
}

export type AssistantIntentResult = {
  intent: AgentIntentType
  confidence: number
  possibleCategories: PossibleCategory[]
  entities: AssistantIntentEntities
  preferredLanguage: PreferredLanguage
}

export type AssistantContextMemory = {
  lastIntent: string
  lastDepartment: string
  lastAction: string
  lastTopic: string
  lastCategory: string
  lastUserQuery: string
  preferredLanguage: PreferredLanguage
}

export type AssistantActionButton = {
  label: string
  route: string
}

export type CitizenAssistantResolution = {
  message: string
  tone: 'friendly human'
  suggestions: string[]
  actionButtons: AssistantActionButton[]
  route?: string
  action: 'redirect' | 'respond' | 'suggest'
  intent?: AgentIntentType
  memory?: AssistantContextMemory
  meta?: {
    category?: string
    department?: string
    complaintId?: string
    currentStage?: string
    lastUpdated?: string
    expectedResolution?: string
    confidence?: number
    possibleCategories?: PossibleCategory[]
    preferredLanguage?: PreferredLanguage
  }
}
