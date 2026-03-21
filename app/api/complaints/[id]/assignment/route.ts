import { NextResponse } from 'next/server'

import { AuthError, requireApiUser } from '@/lib/server/auth'
import {
  assignComplaintToWorkerByDeptHead,
  listAssignableWorkersForComplaint,
  markComplaintViewedByDeptHead,
} from '@/lib/server/complaints'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser(['leader', 'admin'])
    const { id } = await context.params
    const workers = await listAssignableWorkersForComplaint(user, id)
    return NextResponse.json({ workers })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('Failed to load assignable workers', error)
    return NextResponse.json({ error: 'Unable to load assignable workers right now.' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser(['leader', 'admin'])
    const { id } = await context.params
    const body = (await request.json()) as {
      action?: 'mark_viewed' | 'assign_worker'
      worker_id?: string
      user_id?: string
      worker_email?: string
    }
    const workerIdentifier = body.worker_id || body.user_id || body.worker_email

    if (body.action === 'mark_viewed') {
      const complaint = await markComplaintViewedByDeptHead(user, id)
      return NextResponse.json({ complaint })
    }

    if (body.action === 'assign_worker' && workerIdentifier) {
      const complaint = await assignComplaintToWorkerByDeptHead(user, id, workerIdentifier)
      return NextResponse.json({ complaint })
    }

    return NextResponse.json({ error: 'A valid assignment action is required.' }, { status: 400 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('Failed to update complaint assignment', error)
    return NextResponse.json({ error: 'Unable to update complaint assignment right now.' }, { status: 500 })
  }
}
