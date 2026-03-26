import { fetchJson } from '@/lib/client/api'
import type {
  AssistantContextMemory,
  CitizenAssistantResolution,
} from '@/components/chatbot/types'

export async function fetchChatbotReply(
  query: string,
  memory?: AssistantContextMemory,
) {
  return fetchJson<CitizenAssistantResolution>('/api/chatbot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, memory }),
  })
}
