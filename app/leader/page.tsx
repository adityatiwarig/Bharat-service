'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock3, Eye, FileText, Filter, ImageIcon, LockKeyhole, MapPin, MessageSquareText, RotateCcw, ShieldCheck, Sparkles, Users, Workflow } from 'lucide-react'
import { toast } from 'sonner'

import { DashboardLayout } from '@/components/dashboard-layout'
import { LoadingSummary, StatListSkeleton } from '@/components/loading-skeletons'
import { WorkCompletedBadge } from '@/components/status-badge'
import { useSession } from '@/components/session-provider'
import { Badge } from '@/components/ui/badge'
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
import type { Complaint, ComplaintDepartment, ComplaintPriority, ComplaintStatus, Ward } from '@/lib/types'

const statuses: Array<ComplaintStatus | 'all'> = ['all', 'submitted', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected']
const priorityFilters = ['all', 'high', 'medium', 'low'] as const
const SEEN_COMPLAINTS_STORAGE_KEY = 'leader-dashboard-seen-complaints'

type LeaderPriorityFilter = (typeof priorityFilters)[number]

type AssignableWorker = {
  id: string
  ward_id: number
  department: ComplaintDepartment
  user_id?: string
  user_name?: string
  user_email?: string
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatPriorityFilterLabel(value: LeaderPriorityFilter) {
  if (value === 'all') return 'All Priorities'
  if (value === 'high') return 'High / Critical'
  return formatLabel(value)
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Not available'
  }

  return new Date(value).toLocaleString()
}

function matchesPriorityFilter(complaint: Complaint, priorityFilter: LeaderPriorityFilter) {
  if (priorityFilter === 'all') {
    return true
  }

  const normalizedPriority = complaint.priority === 'urgent' ? 'critical' : complaint.priority

  if (priorityFilter === 'high') {
    return normalizedPriority === 'high' || normalizedPriority === 'critical'
  }

  return normalizedPriority === priorityFilter
}

function ComplaintStatusPill({ status }: { status: ComplaintStatus }) {
  const classes: Record<ComplaintStatus, string> = {
    submitted: 'border-slate-200 bg-slate-100 text-slate-700',
    received: 'border-slate-200 bg-slate-100 text-slate-700',
    assigned: 'border-sky-200 bg-sky-100 text-sky-700',
    in_progress: 'border-amber-200 bg-amber-100 text-amber-700',
    resolved: 'border-emerald-200 bg-emerald-100 text-emerald-700',
    closed: 'border-teal-200 bg-teal-100 text-teal-700',
    rejected: 'border-rose-200 bg-rose-100 text-rose-700',
  }

  return (
    <Badge className={`rounded-full border px-3 py-1 ${classes[status]}`}>
      {formatLabel(status)}
    </Badge>
  )
}

function ComplaintPriorityPill({ priority }: { priority: ComplaintPriority }) {
  const normalized = priority === 'urgent' ? 'critical' : priority
  const classes: Record<'critical' | 'high' | 'medium' | 'low', string> = {
    critical: 'border-rose-200 bg-rose-100 text-rose-700',
    high: 'border-orange-200 bg-orange-100 text-orange-700',
    medium: 'border-amber-200 bg-amber-100 text-amber-700',
    low: 'border-emerald-200 bg-emerald-100 text-emerald-700',
  }

  return (
    <Badge className={`rounded-full border px-3 py-1 ${classes[normalized]}`}>
      {formatLabel(normalized)}
    </Badge>
  )
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
  const [priorityFilter, setPriorityFilter] = useState<LeaderPriorityFilter>('all')
  const [wardId, setWardId] = useState('all')
  const [decisionNote, setDecisionNote] = useState('')
  const [seenComplaintIds, setSeenComplaintIds] = useState<string[]>([])
  const [complaintDetailCache, setComplaintDetailCache] = useState<Record<string, Complaint>>({})

  const visibleComplaints = useMemo(
    () => complaints.filter((item) => matchesPriorityFilter(item, priorityFilter)),
    [complaints, priorityFilter],
  )

  const selectedSummary = useMemo(
    () => visibleComplaints.find((item) => item.id === selectedId) || null,
    [visibleComplaints, selectedId],
  )

  const activeComplaint = selectedComplaint?.id === selectedId ? selectedComplaint : selectedSummary
  const activeComplaintId = activeComplaint?.id || ''
  const canAssignWorker = Boolean(activeComplaint?.dept_head_viewed && selectedWorkerId && activeComplaint?.status !== 'closed')
  const canCloseComplaint = activeComplaint?.status === 'resolved' && Boolean(activeComplaint?.rating)
  const canReopenComplaint = activeComplaint?.status === 'resolved' || activeComplaint?.status === 'closed'

  function mergeComplaintState(nextComplaint: Complaint) {
    setComplaints((current) => current.map((item) => item.id === nextComplaint.id ? { ...item, ...nextComplaint } : item))
    setComplaintDetailCache((current) => {
      const cached = current[nextComplaint.id]
      return { ...current, [nextComplaint.id]: cached ? { ...cached, ...nextComplaint } : nextComplaint }
    })
    setSelectedComplaint((current) => current?.id === nextComplaint.id ? { ...current, ...nextComplaint } : current)
  }

  async function loadComplaints(nextSelectedId?: string) {
    setLoading(true)

    try {
      const complaintResult = await fetchComplaints({
        page_size: 100,
        status,
        priority: priorityFilter === 'all' ? undefined : priorityFilter,
        ward_id: wardId === 'all' ? undefined : Number(wardId),
      })
      setComplaints(complaintResult.items)
      const preferredId = nextSelectedId && complaintResult.items.some((item) => item.id === nextSelectedId)
        ? nextSelectedId
        : complaintResult.items[0]?.id || ''
      setSelectedId(preferredId)
      if (!preferredId) {
        setSelectedComplaint(null)
      }
      return preferredId
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load department complaints.')
      return ''
    } finally {
      setLoading(false)
    }
  }

  async function loadComplaintDetails(complaintId: string, forceRefresh = false) {
    if (!complaintId) {
      setSelectedComplaint(null)
      return
    }

    const cachedComplaint = complaintDetailCache[complaintId]
    if (cachedComplaint && !forceRefresh) {
      setSelectedComplaint(cachedComplaint)
      return
    }

    setSelectedComplaint((current) => current?.id === complaintId ? current : null)
    setDetailLoading(true)
    try {
      const detail = await fetchComplaintById(complaintId)
      setComplaintDetailCache((current) => ({ ...current, [complaintId]: detail }))
      setSelectedComplaint(detail)
    } catch (error) {
      setSelectedComplaint(null)
      toast.error(error instanceof Error ? error.message : 'Unable to load complaint details.')
    } finally {
      setDetailLoading(false)
    }
  }

  async function refreshSelection(nextSelectedId?: string) {
    const targetId = await loadComplaints(nextSelectedId || selectedId)
    if (targetId) {
      await loadComplaintDetails(targetId)
    }
  }

  useEffect(() => {
    fetchWards()
      .then(setWards)
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Unable to load wards.')
      })
  }, [])

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(SEEN_COMPLAINTS_STORAGE_KEY)

      if (!stored) {
        return
      }

      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        setSeenComplaintIds(parsed.filter((item): item is string => typeof item === 'string'))
      }
    } catch {
      setSeenComplaintIds([])
    }
  }, [])

  useEffect(() => {
    void loadComplaints(selectedId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, priorityFilter, wardId])

  useEffect(() => {
    setDecisionNote('')
    void loadComplaintDetails(selectedId)
  }, [selectedId])

  useEffect(() => {
    if (!visibleComplaints.length) {
      if (selectedId) {
        setSelectedId('')
      }
      setSelectedComplaint(null)
      return
    }

    if (!visibleComplaints.some((item) => item.id === selectedId)) {
      setSelectedId(visibleComplaints[0]?.id || '')
    }
  }, [visibleComplaints, selectedId])

  useEffect(() => {
    if (!activeComplaintId) {
      setWorkers([])
      setSelectedWorkerId('')
      return
    }

    fetchAssignableWorkers(activeComplaintId)
      .then((result) => {
        setWorkers(result)
        setSelectedWorkerId((current) => current && result.some((worker) => worker.id === current) ? current : result[0]?.id || '')
      })
      .catch((error) => {
        setWorkers([])
        setSelectedWorkerId('')
        toast.error(error instanceof Error ? error.message : 'Unable to load worker options.')
      })
  }, [activeComplaintId])

  function rememberComplaintInteraction(complaintId: string) {
    setSeenComplaintIds((current) => {
      if (current.includes(complaintId)) {
        return current
      }

      const next = [...current, complaintId]

      try {
        window.sessionStorage.setItem(SEEN_COMPLAINTS_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Ignore storage write failures and keep the dashboard responsive.
      }

      return next
    })
  }

  function resetFilters() {
    setStatus('all')
    setPriorityFilter('all')
    setWardId('all')
  }

  async function handleMarkViewed() {
    if (!activeComplaint) return

    setWorking(true)
    try {
      const updatedComplaint = await markComplaintViewed(activeComplaint.id)
      mergeComplaintState(updatedComplaint)
      rememberComplaintInteraction(activeComplaint.id)
      toast.success('Complaint marked as viewed.')
      void loadComplaintDetails(activeComplaint.id, true)
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
      const updatedComplaint = await assignComplaintWorker(activeComplaint.id, selectedWorkerId)
      mergeComplaintState(updatedComplaint)
      toast.success('Worker assigned successfully.')
      void loadComplaintDetails(activeComplaint.id, true)
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

  const newComplaintCount = visibleComplaints.filter((item) => !item.dept_head_viewed && !seenComplaintIds.includes(item.id)).length
  const awaitingAssignment = visibleComplaints.filter((item) => item.dept_head_viewed && !item.worker_assigned && item.status !== 'closed').length
  const activeCount = visibleComplaints.filter((item) => item.progress === 'in_progress').length
  const activeFilters = [status !== 'all', priorityFilter !== 'all', wardId !== 'all'].filter(Boolean).length

  return (
    <DashboardLayout title="Department Head Dashboard">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-[1.6rem] border-slate-200/80">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500">Department</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">
                {session?.department ? formatLabel(session.department) : 'All Departments'}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-[1.6rem] border-slate-200/80">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500">Fresh Complaints</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{loading ? '...' : newComplaintCount}</div>
            </CardContent>
          </Card>
          <Card className="rounded-[1.6rem] border-slate-200/80">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500">Active / Assigned</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{loading ? '...' : activeCount + awaitingAssignment}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(248,250,252,1),rgba(255,247,237,0.95))]">
          <CardContent className="space-y-5 pt-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  <Filter className="h-4 w-4" />
                  Complaint Filters
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">Refine the review queue</div>
                <div className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Narrow the complaint list by status, priority, or ward so fresh cases surface faster and action items stay easy to scan.
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-[1.2rem] border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Active Filters</div>
                  <div className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-950">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    {activeFilters}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-slate-300 bg-white/90"
                  disabled={!activeFilters}
                  onClick={resetFilters}
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <FieldGroup>
                <Field>
                  <FieldLabel className="text-slate-700">Status</FieldLabel>
                  <Select value={status} onValueChange={(value) => setStatus(value as ComplaintStatus | 'all')}>
                    <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white/90">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item === 'all' ? 'All Statuses' : formatLabel(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              <FieldGroup>
                <Field>
                  <FieldLabel className="text-slate-700">Priority</FieldLabel>
                  <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as LeaderPriorityFilter)}>
                    <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white/90">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityFilters.map((item) => (
                        <SelectItem key={item} value={item}>
                          {formatPriorityFilterLabel(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-2 text-xs text-slate-500">High priority also includes critical complaints.</div>
                </Field>
              </FieldGroup>

              <FieldGroup>
                <Field>
                  <FieldLabel className="flex items-center gap-2 text-slate-700">
                    <MapPin className="h-4 w-4" />
                    Ward
                  </FieldLabel>
                  <Select value={wardId} onValueChange={setWardId}>
                    <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white/90">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Wards</SelectItem>
                      {wards.map((ward) => (
                        <SelectItem key={ward.id} value={String(ward.id)}>
                          {ward.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </div>
          </CardContent>
        </Card>

        {loading ? <LoadingSummary label="Loading department complaints" description="Preparing complaints for review, feedback, and closure." /> : null}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
          <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-[#cfd8e3] bg-white">
            <CardHeader className="border-b border-[#d7dfe7] bg-[linear-gradient(180deg,#f8fafc_0%,#f2f6fb_100%)]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5f6f82]">
                    <FileText className="h-4 w-4" />
                    Department Review Queue
                  </div>
                  <CardTitle className="mt-2 text-[1.55rem] text-[#1b365d]">Complaint Register</CardTitle>
                  <CardDescription className="mt-2 max-w-xl text-[0.95rem] leading-6 text-[#5f6f82]">
                    Review department complaints in a structured queue, with fresh cases highlighted for faster scrutiny and assignment.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap gap-3 lg:justify-end">
                  <div className="min-w-[10.75rem] flex-1 rounded-[1.15rem] border border-[#d6dee8] bg-white px-4 py-3 shadow-sm sm:flex-none">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] whitespace-nowrap text-[#6b7280]">Visible Queue</div>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div className="text-2xl font-semibold leading-none text-[#0f172a]">{visibleComplaints.length}</div>
                      <div className="text-xs text-[#64748b]">Cases</div>
                    </div>
                  </div>
                  <div className="min-w-[10.75rem] flex-1 rounded-[1.15rem] border border-[#f1d39a] bg-[#fffaf0] px-4 py-3 shadow-sm sm:flex-none">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] whitespace-nowrap text-[#9a6700]">Fresh Cases</div>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div className="text-2xl font-semibold leading-none text-[#0f172a]">{newComplaintCount}</div>
                      <div className="text-xs text-[#a16207]">Unread</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 bg-[#f3f6f9] px-4 py-5 xl:max-h-[calc(100vh-15rem)] xl:overflow-y-auto">
              {loading ? <StatListSkeleton count={5} /> : visibleComplaints.length ? visibleComplaints.map((complaint) => {
                const isNewComplaint = !complaint.dept_head_viewed && !seenComplaintIds.includes(complaint.id)
                const isSelected = selectedId === complaint.id
                const containerClass = isNewComplaint
                  ? isSelected
                    ? 'border-[#d7b45c] bg-[linear-gradient(135deg,#fffaf0_0%,#fff3d8_100%)] shadow-[0_18px_40px_rgba(180,83,9,0.12)]'
                    : 'border-[#ead4a0] bg-[linear-gradient(135deg,#fffdf6_0%,#fff7e3_100%)] hover:border-[#d7b45c] hover:bg-[#fff9ec]'
                  : isSelected
                    ? 'border-[#8fb3d9] bg-[linear-gradient(135deg,#f7fbff_0%,#eef5fc_100%)] shadow-[0_18px_40px_rgba(30,58,95,0.09)]'
                    : 'border-[#d4dce5] bg-white hover:border-[#b9c5d1] hover:bg-[#fbfdff]'

                return (
                  <button
                    key={complaint.id}
                    type="button"
                    onClick={() => {
                      rememberComplaintInteraction(complaint.id)
                      setSelectedId(complaint.id)
                    }}
                    className={`group relative w-full overflow-hidden rounded-[1.45rem] border px-5 py-5 text-left transition-all duration-200 ${containerClass}`}
                  >
                    <div className={`absolute inset-y-0 left-0 w-1.5 ${isNewComplaint ? 'bg-[#d97706]' : isSelected ? 'bg-[#1d4f91]' : 'bg-[#dbe4ee]'}`} />
                    <div className="pl-2">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.82rem]">
                            {isNewComplaint ? (
                              <span className="inline-flex items-center rounded-full border border-[#f5d18b] bg-white px-3 py-1 font-semibold uppercase tracking-[0.16em] text-[#a16207]">
                                Fresh Case
                              </span>
                            ) : null}
                            <span className="font-semibold text-[#36506d]">{complaint.ward_name}</span>
                          </div>
                          <div className="mt-2 text-[0.82rem] font-medium text-[#66768a]">
                            Complaint ID: {complaint.complaint_id}
                          </div>
                          <div className="mt-3 text-[1.14rem] font-semibold leading-8 text-[#0f172a]">{complaint.title}</div>
                        </div>
                        <ComplaintPriorityPill priority={complaint.priority} />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <ComplaintStatusPill status={complaint.status} />
                        <span className="rounded-full border border-[#d4dce5] bg-[#f8fafc] px-3 py-1 text-xs font-medium text-[#4b5f76]">
                          {formatLabel(complaint.department)}
                        </span>
                        {complaint.proof_image || complaint.proof_text ? <WorkCompletedBadge /> : null}
                      </div>
                    </div>
                  </button>
                )
              }) : (
                <div className="rounded-[1.45rem] border border-dashed border-[#cbd5e1] bg-white px-5 py-10 text-sm text-[#64748b]">
                  No complaints found for the selected department filters.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-[#cfd8e3] bg-white xl:sticky xl:top-6">
            <CardHeader className="border-b border-[#d7dfe7] bg-[linear-gradient(180deg,#f8fafc_0%,#f2f6fb_100%)]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5f6f82]">
                    <ShieldCheck className="h-4 w-4" />
                    Department Action Desk
                  </div>
                  <CardTitle className="mt-2 text-[1.55rem] text-[#1b365d]">Review and Decision Workspace</CardTitle>
                  <CardDescription className="mt-2 max-w-2xl text-[0.95rem] leading-6 text-[#5f6f82]">
                    Keep complaint scrutiny, worker routing, proof verification, and final closure actions in one standardized review panel.
                  </CardDescription>
                </div>
                <div className="min-w-[12.5rem] rounded-[1.15rem] border border-[#d6dee8] bg-white px-4 py-3 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">Selected Complaint</div>
                  <div className="mt-2 max-w-[16rem] truncate text-base font-semibold text-[#0f172a]">
                    {activeComplaint?.complaint_id || 'Awaiting Selection'}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 bg-[#f3f6f9] px-4 py-5 xl:max-h-[calc(100vh-15rem)] xl:overflow-y-auto">
              {detailLoading ? <LoadingSummary label="Loading complaint details" description="Syncing proof, feedback, and update history." /> : null}

              {activeComplaint ? (
                <>
                  <section className="rounded-[1.45rem] border border-[#d4dce5] bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#5f6f82]">
                          <span>{activeComplaint.ward_name}</span>
                          <span className="text-[#c3ccd6]">|</span>
                          <span>{activeComplaint.complaint_id}</span>
                        </div>
                        <div className="mt-3 text-[1.3rem] font-semibold leading-8 text-[#0f172a]">{activeComplaint.title}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <ComplaintStatusPill status={activeComplaint.status} />
                        <ComplaintPriorityPill priority={activeComplaint.priority} />
                        {activeComplaint.proof_image || activeComplaint.proof_text ? <WorkCompletedBadge /> : null}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 lg:grid-cols-3">
                      <div className="rounded-[1.15rem] border border-[#d9e1ea] bg-[#f8fafc] px-4 py-3">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                          <ShieldCheck className="h-4 w-4" />
                          Department Review
                        </div>
                        <div className="mt-2 text-sm font-semibold text-[#0f172a]">{activeComplaint.dept_head_viewed ? 'Completed' : 'Pending'}</div>
                      </div>
                      <div className="rounded-[1.15rem] border border-[#d9e1ea] bg-[#f8fafc] px-4 py-3">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                          <Users className="h-4 w-4" />
                          Worker Routing
                        </div>
                        <div className="mt-2 text-sm font-semibold text-[#0f172a]">{activeComplaint.worker_assigned ? 'Assigned' : 'Awaiting Assignment'}</div>
                      </div>
                      <div className="rounded-[1.15rem] border border-[#d9e1ea] bg-[#f8fafc] px-4 py-3">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                          <Workflow className="h-4 w-4" />
                          Progress State
                        </div>
                        <div className="mt-2 text-sm font-semibold text-[#0f172a]">{formatLabel(activeComplaint.progress)}</div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[1.2rem] border border-[#e2e8f0] bg-[#fbfdff] px-4 py-4 text-sm leading-7 text-[#334155]">
                      {activeComplaint.text}
                    </div>
                  </section>

                  {activeComplaint.proof_image || activeComplaint.proof_text ? (
                    <section className="rounded-[1.4rem] border border-[#a7d7c5] bg-[#f1fbf5] p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#166534]">
                        <ImageIcon className="h-4 w-4" />
                        Worker Proof Submission
                      </div>
                      {activeComplaint.proof_text ? (
                        <div className="mt-3 text-sm leading-6 text-[#14532d]">{activeComplaint.proof_text}</div>
                      ) : null}
                      {activeComplaint.proof_image ? (
                        <img src={activeComplaint.proof_image.url} alt="Worker proof" className="mt-4 max-h-80 rounded-[1.25rem] border border-[#bfe3d2] object-cover" />
                      ) : null}
                    </section>
                  ) : null}

                  {activeComplaint.rating ? (
                    <section className="rounded-[1.4rem] border border-[#bfd6ea] bg-[#f4f9ff] p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#1d4f91]">
                        <MessageSquareText className="h-4 w-4" />
                        Citizen Feedback
                      </div>
                      <div className="mt-3 text-sm font-medium text-[#0f172a]">Rating: {activeComplaint.rating.rating}/5</div>
                      <div className="mt-2 text-sm leading-6 text-[#1e3a5f]">
                        {activeComplaint.rating.feedback || 'Citizen submitted a rating without additional remarks.'}
                      </div>
                      {activeComplaint.rating.created_at ? (
                        <div className="mt-3 flex items-center gap-2 text-xs text-[#52708f]">
                          <Clock3 className="h-4 w-4" />
                          Submitted on {formatDateTime(activeComplaint.rating.created_at)}
                        </div>
                      ) : null}
                    </section>
                  ) : activeComplaint.status === 'resolved' || activeComplaint.status === 'closed' ? (
                    <section className="rounded-[1.35rem] border border-dashed border-[#e3c07b] bg-[#fff8e8] px-4 py-4 text-sm text-[#8a5a00]">
                      Citizen feedback is still pending for this resolution.
                    </section>
                  ) : null}

                  <section className="rounded-[1.45rem] border border-[#d4dce5] bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[#0f172a]">Routing and Review Actions</div>
                        <div className="mt-1 text-sm text-[#64748b]">
                          Keep review decisions, worker mapping, and closure notes in one controlled action zone.
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full border-[#b9c5d1] bg-[#f8fafc]"
                        disabled={working || activeComplaint.dept_head_viewed}
                        onClick={handleMarkViewed}
                      >
                        {working ? <Spinner label="Saving..." /> : <><Eye className="h-4 w-4" /> Mark Viewed</>}
                      </Button>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
                      <div className="rounded-[1.3rem] border border-[#d9e1ea] bg-[#fcfdff] p-4">
                        <div className="text-sm font-semibold text-[#0f172a]">Worker Assignment</div>
                        <div className="mt-1 text-sm text-[#64748b]">
                          Route the complaint only to workers mapped to the same ward and department.
                        </div>

                        <div className="mt-4">
                          <FieldGroup>
                            <Field>
                              <FieldLabel>Assignable Workers</FieldLabel>
                              <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                                <SelectTrigger className="h-12 rounded-2xl border-[#cfd8e3] bg-[#fbfdff]">
                                  <SelectValue placeholder={workers.length ? 'Select worker' : 'No matching worker found'} />
                                </SelectTrigger>
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
                        </div>

                        <div className="mt-4 rounded-[1.15rem] border border-[#d9e1ea] bg-[#f8fafc] px-4 py-4 text-sm text-[#52657a]">
                          {activeComplaint.dept_head_viewed
                            ? 'Only workers from the same ward and department are shown here for assignment or reassignment.'
                            : 'Mark this complaint as viewed first, then assign a worker from the same ward and department.'}
                        </div>

                        {!workers.length ? (
                          <div className="mt-4 rounded-[1.15rem] border border-dashed border-[#e3c07b] bg-[#fff8e8] px-4 py-4 text-sm text-[#8a5a00]">
                            No worker is mapped for {activeComplaint.ward_name} / {formatLabel(activeComplaint.department)} yet.
                          </div>
                        ) : null}

                        <div className="mt-4">
                          <Button
                            type="button"
                            className="rounded-full bg-[#1d4f91] text-white hover:bg-[#163f74]"
                            disabled={working || !canAssignWorker}
                            onClick={handleAssign}
                          >
                            {working ? <Spinner label="Assigning..." /> : <><Users className="h-4 w-4" /> Assign Worker</>}
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-[1.3rem] border border-[#d9e1ea] bg-[#fcfdff] p-4">
                        <div className="text-sm font-semibold text-[#0f172a]">Closure Decision Note</div>
                        <div className="mt-1 text-sm text-[#64748b]">
                          Record the reason before closing or reopening the complaint. Final closure stays locked until citizen feedback is available.
                        </div>
                        <Textarea
                          className="mt-4 border-[#cfd8e3] bg-white"
                          rows={4}
                          value={decisionNote}
                          onChange={(event) => setDecisionNote(event.target.value)}
                          placeholder="Example: Citizen confirmed resolution, closing case."
                        />
                        <div className="mt-4 flex flex-wrap gap-3">
                          <Button
                            type="button"
                            className="rounded-full bg-[#0f766e] text-white hover:bg-[#115e59]"
                            disabled={working || !canCloseComplaint}
                            onClick={handleCloseComplaint}
                          >
                            {working ? <Spinner label="Closing..." /> : <><LockKeyhole className="h-4 w-4" /> Close Complaint</>}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-full border-[#b9c5d1] bg-white"
                            disabled={working || !canReopenComplaint}
                            onClick={handleReopenComplaint}
                          >
                            {working ? <Spinner label="Reopening..." /> : <><RotateCcw className="h-4 w-4" /> Reopen Complaint</>}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[1.45rem] border border-[#d4dce5] bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#0f172a]">
                      <Workflow className="h-4 w-4 text-[#1d4f91]" />
                      Complaint History
                    </div>
                    <div className="mt-4 space-y-3">
                      {activeComplaint.updates?.length ? activeComplaint.updates.map((update) => (
                        <div key={update.id} className="rounded-[1.2rem] border border-[#dbe4ee] bg-[#f8fafc] px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <ComplaintStatusPill status={update.status} />
                            <div className="flex items-center gap-2 text-xs text-[#64748b]">
                              <Clock3 className="h-4 w-4" />
                              {formatDateTime(update.updated_at)}
                            </div>
                          </div>
                          {update.note ? <div className="mt-3 text-sm leading-6 text-[#334155]">{update.note}</div> : null}
                        </div>
                      )) : (
                        <div className="rounded-[1.2rem] border border-dashed border-[#cfd8e3] bg-[#fbfdff] px-4 py-8 text-sm text-[#64748b]">
                          Complaint history will appear here once review or worker updates are recorded.
                        </div>
                      )}
                    </div>
                  </section>
                </>
              ) : (
                <div className="flex min-h-[30rem] items-center justify-center rounded-[1.45rem] border border-dashed border-[#cbd5e1] bg-white px-6 py-10 text-center text-sm text-[#64748b]">
                  Select a complaint from the register to open the full review workspace, inspect status, and manage assignment or closure.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}




