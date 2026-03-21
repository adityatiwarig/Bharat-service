'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, ImageIcon, LockKeyhole, MessageSquareText, RotateCcw, Users } from 'lucide-react'
import { toast } from 'sonner'

import { DashboardLayout } from '@/components/dashboard-layout'
import { LoadingSummary, StatListSkeleton } from '@/components/loading-skeletons'
import { PriorityBadge, StatusBadge, WorkCompletedBadge } from '@/components/status-badge'
import { useSession } from '@/components/session-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import {
  assignComplaintWorker,
  closeComplaintLifecycle,
  fetchAssignableWorkers,
  fetchComplaintById,
  fetchComplaints,
  fetchWards,
  markComplaintViewed,
  reopenComplaintLifecycle,
} from '@/lib/client/complaints'
import type { Complaint, ComplaintDepartment, ComplaintStatus, Ward } from '@/lib/types'

const statuses: Array<ComplaintStatus | 'all'> = ['all', 'submitted', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected']

type AssignableWorker = {
  id: string
  ward_id: number
  department: ComplaintDepartment
  user_id?: string
  user_name?: string
  user_email?: string
}

export default function LeaderDashboardPage() {
  const session = useSession()
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [working, setWorking] = useState(false)
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [wards, setWards] = useState<Ward[]>([])
  const [workers, setWorkers] = useState<AssignableWorker[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [selectedWorkerId, setSelectedWorkerId] = useState('')
  const [status, setStatus] = useState<ComplaintStatus | 'all'>('all')
  const [wardId, setWardId] = useState('all')
  const [decisionNote, setDecisionNote] = useState('')

  const selectedSummary = useMemo(
    () => complaints.find((item) => item.id === selectedId) || null,
    [complaints, selectedId],
  )

  const activeComplaint = selectedComplaint || selectedSummary
  const canAssignWorker = Boolean(activeComplaint?.dept_head_viewed && selectedWorkerId && activeComplaint?.status !== 'closed')
  const canCloseComplaint = activeComplaint?.status === 'resolved' && Boolean(activeComplaint?.rating)
  const canReopenComplaint = activeComplaint?.status === 'resolved' || activeComplaint?.status === 'closed'

  async function loadComplaints(nextSelectedId?: string) {
    setLoading(true)

    try {
      const [complaintResult, wardResult] = await Promise.all([
        fetchComplaints({
          page_size: 20,
          status,
          ward_id: wardId === 'all' ? undefined : Number(wardId),
        }),
        fetchWards(),
      ])

      setComplaints(complaintResult.items)
      setWards(wardResult)
      const preferredId = nextSelectedId && complaintResult.items.some((item) => item.id === nextSelectedId)
        ? nextSelectedId
        : complaintResult.items[0]?.id || ''
      setSelectedId(preferredId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load department complaints.')
    } finally {
      setLoading(false)
    }
  }

  async function loadComplaintDetails(complaintId: string) {
    if (!complaintId) {
      setSelectedComplaint(null)
      return
    }

    setDetailLoading(true)
    try {
      const detail = await fetchComplaintById(complaintId)
      setSelectedComplaint(detail)
    } catch (error) {
      setSelectedComplaint(null)
      toast.error(error instanceof Error ? error.message : 'Unable to load complaint details.')
    } finally {
      setDetailLoading(false)
    }
  }

  async function refreshSelection(nextSelectedId?: string) {
    const targetId = nextSelectedId || selectedId
    await loadComplaints(targetId)
    if (targetId) {
      await loadComplaintDetails(targetId)
    }
  }

  useEffect(() => {
    void loadComplaints(selectedId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, wardId])

  useEffect(() => {
    setDecisionNote('')
    void loadComplaintDetails(selectedId)
  }, [selectedId])

  useEffect(() => {
    if (!activeComplaint) {
      setWorkers([])
      setSelectedWorkerId('')
      return
    }

    fetchAssignableWorkers(activeComplaint.id)
      .then((result) => {
        setWorkers(result)
        setSelectedWorkerId((current) => current && result.some((worker) => worker.id === current) ? current : result[0]?.id || '')
      })
      .catch((error) => {
        setWorkers([])
        setSelectedWorkerId('')
        toast.error(error instanceof Error ? error.message : 'Unable to load worker options.')
      })
  }, [activeComplaint])

  async function handleMarkViewed() {
    if (!activeComplaint) return

    setWorking(true)
    try {
      await markComplaintViewed(activeComplaint.id)
      toast.success('Complaint marked as viewed.')
      await refreshSelection(activeComplaint.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to mark complaint as viewed.')
    } finally {
      setWorking(false)
    }
  }

  async function handleAssign() {
    if (!activeComplaint || !selectedWorkerId) return

    if (!activeComplaint.dept_head_viewed) {
      toast.error('Mark the complaint as viewed before assigning a worker.')
      return
    }

    setWorking(true)
    try {
      await assignComplaintWorker(activeComplaint.id, selectedWorkerId)
      toast.success('Worker assigned successfully.')
      await refreshSelection(activeComplaint.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to assign worker.')
    } finally {
      setWorking(false)
    }
  }

  async function handleCloseComplaint() {
    if (!activeComplaint || !canCloseComplaint) return

    setWorking(true)
    try {
      await closeComplaintLifecycle(activeComplaint.id, decisionNote)
      toast.success('Complaint closed successfully.')
      await refreshSelection(activeComplaint.id)
      setDecisionNote('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to close complaint.')
    } finally {
      setWorking(false)
    }
  }

  async function handleReopenComplaint() {
    if (!activeComplaint || !canReopenComplaint) return

    setWorking(true)
    try {
      await reopenComplaintLifecycle(activeComplaint.id, decisionNote)
      toast.success('Complaint reopened for reassignment.')
      await refreshSelection(activeComplaint.id)
      setDecisionNote('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to reopen complaint.')
    } finally {
      setWorking(false)
    }
  }

  const pendingReview = complaints.filter((item) => !item.dept_head_viewed).length
  const awaitingAssignment = complaints.filter((item) => item.dept_head_viewed && !item.worker_assigned && item.status !== 'closed').length
  const activeCount = complaints.filter((item) => item.progress === 'in_progress').length

  return (
    <DashboardLayout title="Dept Head Dashboard">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-[1.6rem] border-slate-200/80">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500">Department</div>
              <div className="mt-2 text-2xl font-semibold capitalize text-slate-950">
                {session?.department ? session.department.replace('_', ' ') : 'All departments'}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-[1.6rem] border-slate-200/80">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500">Pending Review</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{loading ? '...' : pendingReview}</div>
            </CardContent>
          </Card>
          <Card className="rounded-[1.6rem] border-slate-200/80">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500">Active / Assigned</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{loading ? '...' : activeCount + awaitingAssignment}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="gov-fade-in rounded-[1.75rem] border-slate-200/80">
          <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
            <FieldGroup>
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select value={status} onValueChange={(value) => setStatus(value as ComplaintStatus | 'all')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statuses.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item === 'all' ? 'All statuses' : item.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field>
                <FieldLabel>Ward</FieldLabel>
                <Select value={wardId} onValueChange={setWardId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All wards</SelectItem>
                    {wards.map((ward) => (
                      <SelectItem key={ward.id} value={String(ward.id)}>
                        {ward.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {loading ? <LoadingSummary label="Loading department complaints" description="Preparing complaints for review, feedback, and closure." /> : null}

        <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
          <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
            <CardHeader>
              <CardTitle>Department Complaints</CardTitle>
              <CardDescription>
                Review routed complaints, inspect citizen feedback, and decide closure or reassignment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? <StatListSkeleton count={5} /> : complaints.length ? complaints.map((complaint) => (
                <button
                  key={complaint.id}
                  type="button"
                  onClick={() => setSelectedId(complaint.id)}
                  className={`w-full rounded-[1.35rem] border px-4 py-4 text-left transition ${selectedId === complaint.id ? 'border-sky-300 bg-sky-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-950">{complaint.title}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {complaint.ward_name} / {complaint.complaint_id}
                      </div>
                    </div>
                    <PriorityBadge priority={complaint.priority} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge status={complaint.status} />
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs capitalize text-slate-600">
                      {complaint.department.replace('_', ' ')}
                    </span>
                    {complaint.proof_image || complaint.proof_text ? <WorkCompletedBadge /> : null}
                  </div>
                </button>
              )) : (
                <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                  No complaints found for this department filter.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
            <CardHeader>
              <CardTitle>Review, Feedback And Closure</CardTitle>
              <CardDescription>
                View proof, inspect citizen validation, then close the complaint or reopen it for a fresh worker assignment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {detailLoading ? <LoadingSummary label="Loading complaint details" description="Syncing proof, feedback, and update history." /> : null}

              {activeComplaint ? (
                <>
                  <div className="rounded-[1.45rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">{activeComplaint.title}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {activeComplaint.ward_name} / {activeComplaint.complaint_id}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={activeComplaint.status} />
                        <PriorityBadge priority={activeComplaint.priority} />
                        {activeComplaint.proof_image || activeComplaint.proof_text ? <WorkCompletedBadge /> : null}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                        <div className="text-slate-500">Dept Head Viewed</div>
                        <div className="mt-1 font-semibold text-slate-950">{activeComplaint.dept_head_viewed ? 'Yes' : 'No'}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                        <div className="text-slate-500">Worker Assigned</div>
                        <div className="mt-1 font-semibold text-slate-950">{activeComplaint.worker_assigned ? 'Yes' : 'No'}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                        <div className="text-slate-500">Progress</div>
                        <div className="mt-1 font-semibold capitalize text-slate-950">{activeComplaint.progress.replace('_', ' ')}</div>
                      </div>
                    </div>
                    <div className="mt-4 text-sm leading-7 text-slate-700">{activeComplaint.text}</div>
                  </div>

                  {activeComplaint.proof_image || activeComplaint.proof_text ? (
                    <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                        <ImageIcon className="h-4 w-4" />
                        Worker proof submitted
                      </div>
                      {activeComplaint.proof_text ? (
                        <div className="mt-3 text-sm leading-6 text-emerald-950">{activeComplaint.proof_text}</div>
                      ) : null}
                      {activeComplaint.proof_image ? (
                        <img src={activeComplaint.proof_image.url} alt="Worker proof" className="mt-4 max-h-80 rounded-[1.25rem] border border-emerald-200 object-cover" />
                      ) : null}
                    </div>
                  ) : null}

                  {activeComplaint.rating ? (
                    <div className="rounded-[1.4rem] border border-sky-200 bg-sky-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-sky-900">
                        <MessageSquareText className="h-4 w-4" />
                        Citizen feedback
                      </div>
                      <div className="mt-3 text-sm font-medium text-sky-950">Rating: {activeComplaint.rating.rating}/5</div>
                      <div className="mt-2 text-sm leading-6 text-sky-950">
                        {activeComplaint.rating.feedback || 'Citizen submitted a rating without additional remarks.'}
                      </div>
                      {activeComplaint.rating.created_at ? (
                        <div className="mt-3 text-xs text-sky-700">
                          Submitted on {new Date(activeComplaint.rating.created_at).toLocaleString()}
                        </div>
                      ) : null}
                    </div>
                  ) : activeComplaint.status === 'resolved' || activeComplaint.status === 'closed' ? (
                    <div className="rounded-[1.3rem] border border-dashed border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                      Citizen feedback is still pending for this resolution.
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      disabled={working || activeComplaint.dept_head_viewed}
                      onClick={handleMarkViewed}
                    >
                      {working ? <Spinner label="Saving..." /> : <><Eye className="h-4 w-4" /> Mark Viewed</>}
                    </Button>
                  </div>

                  <FieldGroup>
                    <Field>
                      <FieldLabel>Assignable Workers</FieldLabel>
                      <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                        <SelectTrigger><SelectValue placeholder={workers.length ? 'Select worker' : 'No matching worker found'} /></SelectTrigger>
                        <SelectContent>
                          {workers.map((worker) => (
                            <SelectItem key={worker.id} value={worker.id}>
                              {worker.user_name || worker.user_email || worker.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldGroup>

                  <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    {activeComplaint.dept_head_viewed
                      ? 'Only workers from the same ward and department are shown here for assignment or reassignment.'
                      : 'Mark this complaint as viewed first, then assign a worker from the same ward and department.'}
                  </div>

                  {!workers.length ? (
                    <div className="rounded-[1.3rem] border border-dashed border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                      No worker is mapped for {activeComplaint.ward_name} / {activeComplaint.department.replace('_', ' ')} yet.
                    </div>
                  ) : null}

                  <Button
                    type="button"
                    className="rounded-full"
                    disabled={working || !canAssignWorker}
                    onClick={handleAssign}
                  >
                    {working ? <Spinner label="Assigning..." /> : <><Users className="h-4 w-4" /> Assign Worker</>}
                  </Button>

                  <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-900">Closure decision note</div>
                    <div className="mt-1 text-sm text-slate-500">Add a short reason before closing or reopening the complaint. Final closure stays locked until citizen feedback is available.</div>
                    <Textarea
                      className="mt-4"
                      rows={3}
                      value={decisionNote}
                      onChange={(event) => setDecisionNote(event.target.value)}
                      placeholder="Example: Citizen confirmed resolution, closing case."
                    />
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        className="rounded-full"
                        disabled={working || !canCloseComplaint}
                        onClick={handleCloseComplaint}
                      >
                        {working ? <Spinner label="Closing..." /> : <><LockKeyhole className="h-4 w-4" /> Close Complaint</>}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        disabled={working || !canReopenComplaint}
                        onClick={handleReopenComplaint}
                      >
                        {working ? <Spinner label="Reopening..." /> : <><RotateCcw className="h-4 w-4" /> Reopen Complaint</>}
                      </Button>
                    </div>
                  </div>

                  {activeComplaint.updates?.length ? (
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-slate-900">History</div>
                      {activeComplaint.updates.map((update) => (
                        <div key={update.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <StatusBadge status={update.status} />
                            <div className="text-xs text-slate-500">{new Date(update.updated_at).toLocaleString()}</div>
                          </div>
                          {update.note ? <div className="mt-3 text-sm text-slate-700">{update.note}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                  Select a department complaint from the left to review details, see citizen feedback, and manage closure.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}




