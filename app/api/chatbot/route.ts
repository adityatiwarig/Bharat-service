import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NextResponse } from 'next/server'

import {
  buildComplaintTrackingNotFoundResponse,
  buildComplaintTrackingResponse,
  buildExplanationFallbackResponse,
  buildExplanationGeminiResponse,
  detectAssistantIntent,
  detectPreferredLanguage,
  extractComplaintReference,
  normalizeAssistantMemory,
  resolveCitizenAssistantQuery,
} from '@/components/chatbot/assistant-engine'
import { buildComplaintTrackerSnapshot, formatTrackerDateTime } from '@/lib/complaint-tracker'
import type { Complaint, PublicComplaintLookupResult } from '@/lib/types'

export const runtime = 'nodejs'

type GeminiApiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
  promptFeedback?: {
    blockReason?: string
  }
}

type ComplaintApiResponse = {
  complaint?: Complaint
  error?: string
}

type SessionMeResponse = {
  user?: Record<string, unknown> | null
}

const GEMINI_TIMEOUT_MS = 15000

function sanitizeGeminiReply(value: string) {
  return value
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildGeminiPrompt(userQuery: string, preferredLanguage: 'english' | 'hinglish') {
  return `You are a smart citizen assistant.

Rules:
- You only answer about this complaint portal and its complaint workflow
- If the question is unrelated, refuse briefly
- Answer directly
- Max 2-3 lines
- Use ${preferredLanguage === 'english' ? 'English only' : 'Hinglish only'}
- No "I can help"
- No buttons, no redirect language, no extra suggestions

User: ${userQuery}`
}

function extractGeminiKeyFromEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return ''
  }

  const content = readFileSync(filePath, 'utf8')
  const match = content.match(/^GEMINI_API_KEY=(.+)$/m)

  if (!match) {
    return ''
  }

  return match[1].trim().replace(/^['"]|['"]$/g, '')
}

function resolveGeminiApiKey() {
  const localEnvKey = extractGeminiKeyFromEnvFile(
    join(process.cwd(), '.env.local'),
  )

  if (localEnvKey) {
    return localEnvKey
  }

  const envFileKey = extractGeminiKeyFromEnvFile(join(process.cwd(), '.env'))

  if (envFileKey) {
    return envFileKey
  }

  return process.env.GEMINI_API_KEY?.trim() || ''
}

function resolveGeminiModels() {
  return Array.from(
    new Set(
      [
        process.env.GEMINI_MODEL?.trim(),
        'gemini-2.5-flash',
        'gemini-2.0-flash',
      ].filter((model): model is string => Boolean(model)),
    ),
  )
}

function extractGeminiReply(data: GeminiApiResponse) {
  const text = data.candidates
    ?.flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => part.text?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ')
    .trim()

  return text || ''
}

function buildInternalRequestHeaders(request: Request) {
  const headers = new Headers()
  const cookie = request.headers.get('cookie')

  if (cookie) {
    headers.set('cookie', cookie)
  }

  return headers
}

function formatExpectedResolution(deadline?: string | null) {
  if (!deadline) {
    return ''
  }

  const remainingMs = new Date(deadline).getTime() - Date.now()

  if (Number.isNaN(remainingMs)) {
    return ''
  }

  if (remainingMs <= 0) {
    return 'Due now'
  }

  const days = Math.ceil(remainingMs / (1000 * 60 * 60 * 24))
  return days === 1 ? '1 day' : `${days} days`
}

async function fetchComplaintTrackingSummary(request: Request, complaintId: string) {
  try {
    const origin = new URL(request.url).origin
    const headers = buildInternalRequestHeaders(request)
    const encodedComplaintId = encodeURIComponent(complaintId)

    const complaintResponse = await fetch(
      `${origin}/api/complaints/${encodedComplaintId}?view=summary`,
      {
        headers,
        cache: 'no-store',
      },
    )

    if (complaintResponse.ok) {
      const data = (await complaintResponse.json()) as ComplaintApiResponse

      if (data.complaint) {
        const tracker = buildComplaintTrackerSnapshot(data.complaint)

        return {
          complaintId: data.complaint.complaint_id,
          status: tracker.humanStatus,
          department: tracker.departmentLabel,
          currentStage: tracker.currentStageTitle,
          lastUpdated: formatTrackerDateTime(data.complaint.updated_at),
          expectedResolution: formatExpectedResolution(data.complaint.deadline),
          detailRoute: `/citizen/tracker?id=${encodeURIComponent(data.complaint.complaint_id)}`,
        }
      }
    }

    const publicResponse = await fetch(
      `${origin}/api/public/complaints/${encodedComplaintId}`,
      {
        headers,
        cache: 'no-store',
      },
    )

    if (!publicResponse.ok) {
      return null
    }

    const data = (await publicResponse.json()) as PublicComplaintLookupResult

    return {
      complaintId: data.complaint.complaint_id,
      status: data.complaint.status,
      department: data.complaint.department,
      currentStage: data.complaint.current_stage,
      lastUpdated: formatTrackerDateTime(data.complaint.last_updated),
      expectedResolution: '',
      detailRoute:
        data.access === 'owner' && data.redirect_to
          ? data.redirect_to
          : `/track?code=${encodeURIComponent(complaintId)}`,
    }
  } catch (error) {
    console.error('Complaint tracking lookup failed', error)
    return null
  }
}

async function fetchSessionState(request: Request) {
  try {
    const origin = new URL(request.url).origin
    const response = await fetch(`${origin}/api/session/me`, {
      headers: buildInternalRequestHeaders(request),
      cache: 'no-store',
    })

    if (!response.ok) {
      return false
    }

    const data = (await response.json()) as SessionMeResponse
    return Boolean(data.user)
  } catch (error) {
    console.error('Session lookup failed', error)
    return false
  }
}

async function callGemini(
  userQuery: string,
  preferredLanguage: 'english' | 'hinglish',
) {
  const apiKey = resolveGeminiApiKey()

  if (!apiKey) {
    console.error('Gemini FULL ERROR: Missing GEMINI_API_KEY in process.env/.env files')
    return ''
  }

  for (const model of resolveGeminiModels()) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: buildGeminiPrompt(userQuery, preferredLanguage),
                  },
                ],
              },
            ],
          }),
          cache: 'no-store',
          signal: controller.signal,
        },
      )

      if (!res.ok) {
        const errorText = await res.text()
        console.error(`Gemini FULL ERROR (${model}):`, errorText)
        continue
      }

      const data = (await res.json()) as GeminiApiResponse
      const reply = extractGeminiReply(data)

      if (reply) {
        return reply
      }

      console.error(
        `Gemini EMPTY RESPONSE (${model}):`,
        data.promptFeedback?.blockReason || 'No text parts returned',
      )
    } catch (error) {
      console.error(`Gemini crash (${model}):`, error)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  return ''
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      query?: string
      memory?: {
        lastIntent?: string
        lastDepartment?: string
        lastAction?: string
        lastTopic?: string
        lastCategory?: string
        lastUserQuery?: string
        preferredLanguage?: 'english' | 'hinglish'
      }
    }

    const userQuery = body.query?.trim()
    const memory = normalizeAssistantMemory(body.memory)

    if (!userQuery) {
      return NextResponse.json(
        { error: 'Query is required.' },
        { status: 400 },
      )
    }

    const preferredLanguage = detectPreferredLanguage(userQuery, memory)
    const complaintReference = extractComplaintReference(userQuery)

    if (complaintReference) {
      const complaintSummary = await fetchComplaintTrackingSummary(
        request,
        complaintReference,
      )

      return NextResponse.json(
        complaintSummary
          ? buildComplaintTrackingResponse({
              complaintId: complaintSummary.complaintId,
              status: complaintSummary.status,
              department: complaintSummary.department,
              currentStage: complaintSummary.currentStage,
              lastUpdated: complaintSummary.lastUpdated,
              expectedResolution: complaintSummary.expectedResolution,
              detailRoute: complaintSummary.detailRoute,
              memory,
              preferredLanguage,
            })
          : buildComplaintTrackingNotFoundResponse({
              complaintId: complaintReference,
              memory,
              preferredLanguage,
            }),
      )
    }

    const isLoggedIn = await fetchSessionState(request)
    const localResolution = resolveCitizenAssistantQuery(userQuery, memory, {
      isLoggedIn,
    })

    if (localResolution) {
      return NextResponse.json(localResolution)
    }

    const intentResult = detectAssistantIntent(userQuery, memory)

    if (intentResult.intent !== 'EXPLANATION') {
      return NextResponse.json(
        buildExplanationFallbackResponse({
          query: userQuery,
          memory,
          analysis: intentResult,
        }),
      )
    }

    const reply = await callGemini(
      userQuery,
      intentResult.preferredLanguage,
    )

    if (!reply) {
      return NextResponse.json(
        buildExplanationFallbackResponse({
          query: userQuery,
          memory,
          analysis: intentResult,
        }),
      )
    }

    return NextResponse.json(
      buildExplanationGeminiResponse({
        reply: sanitizeGeminiReply(reply),
        query: userQuery,
        memory,
        analysis: intentResult,
      }),
    )
  } catch (error) {
    console.error('Chatbot API failed', error)
    const fallbackMemory = normalizeAssistantMemory()
    const fallbackAnalysis = detectAssistantIntent(
      'explain citizen services',
      fallbackMemory,
    )
    return NextResponse.json(
      buildExplanationFallbackResponse({
        query: 'citizen services',
        memory: fallbackMemory,
        analysis: fallbackAnalysis,
      }),
    )
  }
}
