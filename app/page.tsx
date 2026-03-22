import type { ComponentType } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Construction,
  FileText,
  Globe2,
  MapPinned,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
  Volume2,
} from 'lucide-react'

import { HeroSliderSection } from '@/components/hero-slider-section'
import { LandingFooter } from '@/components/landing-footer'
import { PublicNavbar } from '@/components/public-navbar'
import { Button } from '@/components/ui/button'
import { getCurrentUser } from '@/lib/server/auth'

const citizenServices = [
  {
    title: 'Roads and Public Safety',
    description: 'Report potholes, damaged roads, open drains, unsafe footpaths, and related public safety issues.',
    icon: Building2,
  },
  {
    title: 'Water and Sanitation',
    description: 'Raise complaints for leakage, sewer blockage, drainage overflow, and sanitation concerns.',
    icon: ShieldCheck,
  },
  {
    title: 'Garbage Collection',
    description: 'Report unattended garbage, delayed pickup, and unclean public spaces in your area.',
    icon: Trash2,
  },
  {
    title: 'Encroachment',
    description: 'Report road, market, or footpath encroachment affecting public movement and access.',
    icon: MapPinned,
  },
  {
    title: 'Illegal Construction',
    description: 'Submit complaints related to unauthorized building activity or unsafe structural development.',
    icon: Construction,
  },
  {
    title: 'Noise Pollution',
    description: 'Raise complaints for loudspeaker, generator, construction, or recurring neighborhood noise.',
    icon: Volume2,
  },
]

const processSteps = [
  {
    title: 'Register or sign in',
    description: 'Citizen logs in and opens the complaint submission flow.',
    timeline: 'Stage 1',
  },
  {
    title: 'Submit complaint details',
    description: 'Ward, department, category, location, and supporting details are captured.',
    timeline: 'Stage 2',
  },
  {
    title: 'Officer assignment',
    description: 'Complaint is routed to the concerned officer and visible in the assigned workflow.',
    timeline: 'Stage 3',
  },
  {
    title: 'Action and updates',
    description: 'Department action, field movement, and progress updates appear in the timeline.',
    timeline: 'Stage 4',
  },
  {
    title: 'Resolution or escalation',
    description: 'Resolved complaints close formally, while delayed cases move to the next authority.',
    timeline: 'Stage 5',
  },
]

const trustSignals = [
  'Assigned officer visibility and complaint ownership throughout processing.',
  'Standard municipal SLA benchmark with escalation workflow on delay.',
  'Complaint ID based tracking from submission to final closure.',
  'Government-style public grievance interface with ward-based routing.',
]

const progressStages = ['Submitted', 'Assigned', 'In Progress', 'Resolved']

function getCitizenPath(path: string, isLoggedIn: boolean) {
  return isLoggedIn ? path : `/auth?mode=signup&next=${encodeURIComponent(path)}`
}

function getCitizenLoginPath(path: string, isLoggedIn: boolean) {
  return isLoggedIn ? path : `/auth?mode=login&next=${encodeURIComponent(path)}`
}

export default async function Home() {
  const user = await getCurrentUser()
  const isCitizenLoggedIn = user?.role === 'citizen'
  const primaryHref = getCitizenPath('/citizen/submit', isCitizenLoggedIn)
  const secondaryHref = isCitizenLoggedIn ? '/citizen' : '/auth?mode=signup&next=%2Fcitizen%2Fsubmit'
  const trackerHref = getCitizenLoginPath('/citizen/tracker', isCitizenLoggedIn)
  const lastUpdated = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <PublicNavbar isLoggedIn={isCitizenLoggedIn} primaryHref={primaryHref} trackerHref={trackerHref} />

      <main>
        <HeroSliderSection primaryHref={primaryHref} trackerHref={trackerHref} />

        <section id="main-content" className="relative border-b border-[#d8e1ea] bg-[linear-gradient(180deg,#fbfdff_0%,#f2f7fb_100%)] pt-32 lg:pt-34">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,#ff9933_0%,#ffffff_50%,#138808_100%)]" />

          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-[60px] sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:gap-10 lg:px-8">
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="text-sm font-semibold tracking-[0.2em] text-[#0b3c5d] uppercase">
                  Citizen Services
                </div>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-[3.2rem] lg:text-[3.5rem] lg:leading-[1.04]">
                  Public Grievance Portal
                </h1>
                <p className="max-w-xl text-lg leading-8 text-slate-600">
                  File and track civic complaints easily.
                </p>
              </div>

              <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:flex-wrap">
                <Link href={primaryHref}>
                  <Button size="lg" className="rounded-md bg-[#0b3c5d] px-7 text-white shadow-[0_12px_28px_rgba(11,60,93,0.18)] hover:bg-[#092f48]">
                    Lodge Complaint
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={trackerHref}>
                  <Button variant="outline" size="lg" className="rounded-md border-[#c8d4df] px-7 text-[#0b3c5d] hover:bg-[#f8fbff]">
                    Track Complaint
                  </Button>
                </Link>
                <Link href={secondaryHref}>
                  <Button variant="outline" size="lg" className="rounded-md border-[#c8d4df] px-7 text-slate-700 hover:bg-white">
                    {isCitizenLoggedIn ? 'Open Citizen Dashboard' : 'Citizen Login / Register'}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_18px_46px_rgba(15,23,42,0.08)] ring-1 ring-[#d9e2ea]">
              <div className="space-y-4 bg-[#f8fafc] px-6 py-6">
                <div className="text-xs font-semibold tracking-[0.18em] text-[#0b3c5d] uppercase">
                  Tracking Timeline
                </div>
                <div className="text-sm text-slate-600">Complaint ID example: MCD-2026-01458</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {progressStages.map((stage, index) => (
                    <div key={stage} className="flex items-center gap-2 bg-white px-4 py-3 text-sm ring-1 ring-[#d9e2ea]">
                      <CircleDot className="h-4 w-4 text-[#0b3c5d]" />
                      <span className="font-medium text-slate-800">{stage}</span>
                      <span className="ml-auto text-xs text-slate-500">{String(index + 1).padStart(2, '0')}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-[1.25rem] bg-white px-4 py-4 text-sm leading-7 text-slate-600 ring-1 ring-[#d9e2ea]">
                  Track every complaint using your complaint ID and view stage-wise progress until final resolution.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[1fr_0.95fr]">
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-semibold tracking-[0.24em] text-[#0b3c5d] uppercase">Official Information</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    Structured public-facing information for grievance filing
                  </h2>
                </div>

                <div className="grid gap-3">
                  <InfoRow
                    icon={FileText}
                    title="Scope of the portal"
                    description="This portal supports complaints related to roads, sanitation, water, drainage, encroachment, illegal construction, and other municipal public service matters."
                  />
                  <InfoRow
                    icon={ShieldAlert}
                    title="Legal clarity"
                    description="This portal does not handle RTI applications, court matters, or wider policy issues."
                  />
                  <InfoRow
                    icon={ClipboardCheck}
                    title="Complaint proof and tracking"
                    description="Each submission receives a complaint ID and follows a visible stage-wise status flow."
                  />
                </div>
              </div>

              <div className="bg-[#f8fafc] px-5 py-5 ring-1 ring-[#e0e8f0]">
                <div className="text-sm font-semibold tracking-[0.24em] text-[#0b3c5d] uppercase">Trust and Public Assurance</div>
                <div className="mt-4 grid gap-3">
                  {trustSignals.map((point) => (
                    <div key={point} className="flex items-start gap-3 bg-white px-4 py-3.5 ring-1 ring-[#d9e2ea]">
                      <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 text-emerald-600" />
                      <span className="text-sm leading-6 text-slate-700">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="relative bg-[#f7fafc] py-16">
          <div id="yojana" className="absolute -top-28" aria-hidden="true" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold tracking-[0.24em] text-[#0b3c5d] uppercase">Yojana and Citizen Service Categories</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Explore public service areas before you register a complaint
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                This section helps citizens quickly understand the municipal services and assistance areas available on the portal.
              </p>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {citizenServices.map((item) => {
                const Icon = item.icon

                return (
                  <div
                    key={item.title}
                    className="bg-white px-5 py-5 ring-1 ring-[#d9e2ea] transition hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(15,23,42,0.06)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#eef5fb] text-[#0b3c5d] ring-1 ring-[#d8e4ef]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-slate-950">{item.title}</div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold tracking-[0.24em] text-[#0b3c5d] uppercase">How It Works</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Complaint resolution in five clear steps
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  From complaint filing to final closure, each stage is visible so citizens can track progress with clarity.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.4rem] bg-[#f8fbff] px-4 py-4 ring-1 ring-[#d9e2ea]">
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-[#0b3c5d] uppercase">Average Action</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">2-5 Days</div>
                </div>
                <div className="rounded-[1.4rem] bg-[#f8fbff] px-4 py-4 ring-1 ring-[#d9e2ea]">
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-[#0b3c5d] uppercase">Tracking</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">Complaint ID</div>
                </div>
                <div className="rounded-[1.4rem] bg-[#f8fbff] px-4 py-4 ring-1 ring-[#d9e2ea]">
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-[#0b3c5d] uppercase">Escalation</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">SLA Based</div>
                </div>
              </div>
            </div>

            <div className="mt-10 overflow-hidden rounded-[2rem] border border-[#d9e2ea] bg-[linear-gradient(180deg,#f8fbff_0%,#f2f7fb_100%)] shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
              <div className="grid gap-0 lg:grid-cols-5">
                {processSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="relative border-b border-[#d9e2ea] px-5 py-6 last:border-b-0 lg:min-h-[18rem] lg:border-b-0 lg:border-r lg:last:border-r-0"
                  >
                    {index < processSteps.length - 1 ? (
                      <div className="hidden lg:block">
                        <div className="absolute left-[calc(100%-18px)] top-8 h-px w-9 bg-[#c5d4e3]" />
                        <ChevronRight className="absolute left-[calc(100%-10px)] top-[26px] h-4 w-4 text-[#9cb1c7]" />
                      </div>
                    ) : null}

                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0b3c5d] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(11,60,93,0.18)]">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold tracking-[0.2em] text-[#9a3412] uppercase">{step.timeline}</div>
                        <div className="mt-1 h-1 w-16 rounded-full bg-[linear-gradient(90deg,#ff9933_0%,#0b3c5d_100%)]" />
                      </div>
                    </div>

                    <div className="mt-6 text-[1.45rem] font-semibold leading-9 text-slate-950">{step.title}</div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f7fafc] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1fr_0.92fr]">
              <div>
                <p className="text-sm font-semibold tracking-[0.24em] text-[#0b3c5d] uppercase">Public Trust Markers</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Clear authority, visible ownership, and accountable grievance handling
                </h2>

                <div className="mt-6 grid gap-3">
                  {[
                    { label: 'Authority', value: 'Municipal Corporation of Delhi' },
                    { label: 'Technology Partner', value: 'NIC-aligned digital workflow' },
                    { label: 'Policy Support', value: 'SLA visibility, escalation flow, and structured tracking' },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col gap-1 bg-white px-4 py-4 ring-1 ring-[#d9e2ea] sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs font-semibold tracking-[0.18em] text-[#0b3c5d] uppercase">{item.label}</div>
                      <div className="text-sm text-slate-700">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    icon: Users,
                    title: 'Citizen Access',
                    description: 'File complaints, track status updates, and view complaint movement with your complaint ID.',
                  },
                  {
                    icon: PhoneCall,
                    title: 'Department Access',
                    description: 'Officers sign in separately to handle assignment, field action, and resolution workflow.',
                  },
                  {
                    icon: Globe2,
                    title: 'Multi-language Direction',
                    description: 'The interface remains English-first for now, with Hindi support planned for broader access.',
                  },
                ].map((item) => {
                  const Icon = item.icon

                  return (
                    <div
                      key={item.title}
                      className="bg-white px-5 py-5 ring-1 ring-[#d9e2ea] transition hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(15,23,42,0.06)]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center bg-[#eef5fb] text-[#0b3c5d] ring-1 ring-[#d8e4ef]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-slate-950">{item.title}</div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter lastUpdated={lastUpdated} />
    </div>
  )
}

function InfoRow({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 bg-[#f8fafc] px-4 py-4 ring-1 ring-[#e0e8f0]">
      <div className="flex h-10 w-10 items-center justify-center bg-white text-[#0b3c5d] ring-1 ring-[#d8e4ef]">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-base font-semibold text-slate-950">{title}</div>
        <p className="mt-1.5 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  )
}
