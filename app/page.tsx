import type { ComponentType } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Construction,
  FileText,
  MapPinned,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Volume2,
} from 'lucide-react'

import { DeferredLandingWardHeatmap } from '@/components/deferred-landing-ward-heatmap'
import { HeroSliderSection } from '@/components/hero-slider-section'
import { LandingFooter } from '@/components/landing-footer'
import { MidPageBannerCarousel } from '@/components/mid-page-banner-carousel'
import { PublicNavbar } from '@/components/public-navbar'
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
    description: 'Sign in to begin your complaint.',
    timeline: 'Stage 1',
  },
  {
    title: 'Submit complaint details',
    description: 'Add ward, issue, and location details.',
    timeline: 'Stage 2',
  },
  {
    title: 'Officer assignment',
    description: 'The case is routed to the right officer.',
    timeline: 'Stage 3',
  },
  {
    title: 'Action and updates',
    description: 'Teams post progress and field updates.',
    timeline: 'Stage 4',
  },
  {
    title: 'Resolution or escalation',
    description: 'Close the case or escalate on delay.',
    timeline: 'Stage 5',
  },
]

const trustSignals = [
  'Assigned officer visibility and complaint ownership throughout processing.',
  'Standard municipal SLA benchmark with escalation workflow on delay.',
  'Complaint ID based tracking from submission to final closure.',
  'Government-style public grievance interface with ward-based routing.',
]

const portalActions = [
  {
    title: 'Citizen Login / Register',
    description: 'Access your dashboard and manage requests.',
    href: '/auth?mode=signup&next=%2Fcitizen%2Fsubmit',
  },
  {
    title: 'Lodge Complaint',
    description: 'Submit your issue quickly and securely.',
    href: '/citizen/submit',
  },
  {
    title: 'Track Complaint',
    description: 'Check real-time complaint status.',
    href: '/track',
  },
]

function getCitizenPath(path: string, isLoggedIn: boolean) {
  return isLoggedIn ? path : `/auth?mode=signup&next=${encodeURIComponent(path)}`
}

export default async function Home() {
  const user = await getCurrentUser()
  const isCitizenLoggedIn = user?.role === 'citizen'
  const primaryHref = getCitizenPath('/citizen/submit', isCitizenLoggedIn)
  const secondaryHref = isCitizenLoggedIn ? '/citizen' : '/auth?mode=signup&next=%2Fcitizen%2Fsubmit'
  const trackerHref = '/track'
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

        <section
          id="main-content"
          className="relative overflow-hidden border-b border-[#d8e1ea] bg-[linear-gradient(180deg,#fbfdff_0%,#f2f7fb_100%)] pt-32 lg:pt-34"
        >
          <div className="absolute inset-0 gov-portal-dots opacity-100" aria-hidden="true" />
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,#ff9933_0%,#ffffff_50%,#138808_100%)]" />

          <div className="mx-auto max-w-7xl px-4 py-[60px] sm:px-6 lg:px-8">
            <div className="relative grid gap-10 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-10 lg:px-8">
              <div className="space-y-5 lg:max-w-[33rem]">
                <div className="space-y-3">
                  <div className="text-sm font-semibold tracking-[0.2em] text-[#0b3c5d] uppercase">
                    Citizen Services
                  </div>
                  <h1 className="font-[Georgia,'Times_New_Roman',serif] text-[3rem] font-semibold leading-[0.98] tracking-[0.01em] text-slate-950 sm:text-[3.6rem] lg:text-[4rem]">
                    Public Grievance
                    <span className="mt-2 block text-[#0b3c5d]">Portal</span>
                  </h1>
                  <div className="h-[3px] w-28 rounded-full bg-[linear-gradient(90deg,#ff9933_0%,#ffffff_50%,#138808_100%)]" />
                  <p className="max-w-xl text-lg leading-8 text-slate-600">
                    File and track civic complaints easily.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:justify-items-center">
                {portalActions.map((action) => {
                  const href =
                    action.title === 'Lodge Complaint'
                      ? primaryHref
                      : action.title === 'Citizen Login / Register'
                        ? secondaryHref
                        : trackerHref

                  return (
                    <Link
                      key={action.title}
                      href={href}
                      className="gov-portal-card group flex min-h-[220px] w-full max-w-[20rem] flex-col justify-between rounded-[1.5rem] p-7 text-slate-950 transition duration-300 ease-out hover:-translate-y-2 hover:border-[#ff5722] hover:shadow-[0_22px_44px_rgba(255,87,34,0.14)]"
                    >
                      <div className="space-y-4">
                        <div className="text-[11px] font-semibold tracking-[0.22em] text-[#0b3c5d] uppercase">
                          Citizen Action
                        </div>
                        <div className="text-[1.85rem] font-semibold leading-[1.15] text-slate-950">{action.title}</div>
                      </div>
                      <div className="space-y-5">
                        <p className="text-[0.98rem] leading-7 text-slate-600">{action.description}</p>
                        <div className="flex items-center gap-2 text-base font-semibold text-[#c2410c]">
                          <span>Open</span>
                          <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
                        </div>
                      </div>
                    </Link>
                  )
                })}
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

        <MidPageBannerCarousel primaryHref={primaryHref} trackerHref={trackerHref} />

        <section id="how-it-works" className="relative overflow-hidden bg-[#0f172a] py-16">
          <div className="absolute inset-0 gov-process-dots opacity-80" aria-hidden="true" />
          <div className="gov-process-glow absolute -left-20 top-20 h-72 w-72 rounded-full" aria-hidden="true" />
          <div className="gov-process-glow absolute -right-12 bottom-10 h-64 w-64 rounded-full opacity-60" aria-hidden="true" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold tracking-[0.24em] text-slate-300 uppercase">How It Works</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Complaint resolution in five clear steps
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-300">
                  From complaint filing to final closure, each stage is visible so citizens can track progress with clarity.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="gov-process-stat rounded-[1.4rem] px-4 py-4">
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-300 uppercase">Average Action</div>
                  <div className="mt-2 text-2xl font-semibold text-white">2-5 Days</div>
                </div>
                <div className="gov-process-stat rounded-[1.4rem] px-4 py-4">
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-300 uppercase">Tracking</div>
                  <div className="mt-2 text-2xl font-semibold text-white">Complaint ID</div>
                </div>
                <div className="gov-process-stat rounded-[1.4rem] px-4 py-4">
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-300 uppercase">Escalation</div>
                  <div className="mt-2 text-2xl font-semibold text-white">SLA Based</div>
                </div>
              </div>
            </div>

            <div className="relative mt-10">
              <div className="absolute bottom-6 left-10 top-6 w-px bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,87,34,0.4)_50%,rgba(255,255,255,0.14)_100%)] lg:hidden" />
              <div className="absolute left-[10%] right-[10%] top-7 hidden h-px bg-[linear-gradient(90deg,rgba(255,255,255,0.14)_0%,rgba(255,87,34,0.45)_50%,rgba(255,255,255,0.14)_100%)] lg:block" />

              <div className="grid gap-4 lg:grid-cols-5">
                {processSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className={`gov-process-card group relative rounded-[1.6rem] px-5 py-5 pl-24 transition duration-300 ease-out hover:-translate-y-1.5 lg:min-h-[17rem] lg:px-5 lg:pt-[4.5rem] ${
                      index === 0 ? 'gov-process-card-active' : ''
                    }`}
                  >
                    <div
                      className={`absolute left-[0.75rem] top-5 flex h-14 w-14 items-center justify-center rounded-full border text-sm font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.32)] lg:left-1/2 lg:top-0 lg:-translate-x-1/2 ${
                        index === 0
                          ? 'border-[#ff5722] bg-[#ff5722]/18 shadow-[0_0_0_1px_rgba(255,87,34,0.35),0_0_24px_rgba(255,87,34,0.28)]'
                          : 'border-white/18 bg-white/10'
                      }`}
                    >
                      <div className="absolute inset-[3px] rounded-full border border-white/12" />
                      <div className="relative">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                    </div>

                    <div className="text-[11px] font-semibold tracking-[0.2em] text-[#ffb18f] uppercase">{step.timeline}</div>
                    <div className="mt-3 text-[1.35rem] font-semibold leading-8 text-white">{step.title}</div>
                    <p className="mt-3 max-w-[18rem] text-sm leading-7 text-slate-300">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="gov-directory-section overflow-hidden bg-[#f8fafc] py-16">
          <div className="relative z-[2] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[1.25rem] border border-[#cfd8e3] bg-white p-6 sm:p-8 lg:p-10">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold tracking-[0.24em] text-[#0b3c5d] uppercase">
                  Ward-wise Complaint Distribution
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Ward-wise Complaint Distribution
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  Live overview of complaint volume across wards
                </p>
              </div>

              <div className="mt-8">
                <DeferredLandingWardHeatmap />
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
