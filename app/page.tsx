import Link from 'next/link'
import {
  ArrowRight,
  BellRing,
  Building2,
  CheckCircle2,
  Clock3,
  ClipboardPlus,
  FileText,
  Landmark,
  MapPinned,
  PhoneCall,
  SearchCheck,
  ShieldCheck,
  Users,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/server/auth'

const citizenServices = [
  {
    title: 'Roads and Public Safety',
    description: 'Report potholes, damaged roads, open drains, unsafe footpaths, and similar public safety issues.',
    icon: Building2,
    tone: 'bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_100%)]',
    accent: 'text-[#b45309] bg-[#ffedd5]',
  },
  {
    title: 'Water and Sanitation',
    description: 'Report water leakage, sewer blockage, garbage collection delays, drainage overflow, and sanitation concerns.',
    icon: ShieldCheck,
    tone: 'bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_100%)]',
    accent: 'text-[#1d4ed8] bg-[#dbeafe]',
  },
  {
    title: 'Streetlights and Utilities',
    description: 'Report streetlight faults, electrical hazards, and other public utility problems in your area.',
    icon: BellRing,
    tone: 'bg-[linear-gradient(180deg,#f0fdf4_0%,#ffffff_100%)]',
    accent: 'text-[#15803d] bg-[#dcfce7]',
  },
]

const processSteps = [
  {
    title: 'Create your account',
    description: 'Sign up once with your email address and password to use citizen services.',
  },
  {
    title: 'Select ward and issue type',
    description: 'Choose your ward, complaint category, and enter the issue details in a simple form.',
  },
  {
    title: 'Submit complaint',
    description: 'Add location or landmark details if needed and submit your complaint for action.',
  },
  {
    title: 'Track status anytime',
    description: 'Use your complaint ID to check progress, department action, and final resolution.',
  },
]

const trustSignals = [
  'Citizen access and department access are kept separate for clarity and security.',
  'Complaints are routed ward-wise so the responsible officer can take action faster.',
  'Each submission gets a complaint ID for status tracking and follow-up.',
  'The form stays simple, clear, and suitable for regular public use.',
]

const heroServices = [
  {
    title: 'Register Complaint',
    description: 'File a civic complaint in a few simple steps.',
    icon: ClipboardPlus,
  },
  {
    title: 'Track Complaint',
    description: 'Check action and status using your complaint ID.',
    icon: SearchCheck,
  },
  {
    title: 'Ward-Based Routing',
    description: 'Complaints are sent to the relevant ward officer.',
    icon: MapPinned,
  },
  {
    title: 'Citizen Support',
    description: 'Use the portal any time for public service issues.',
    icon: PhoneCall,
  },
]

function getCitizenPath(path: string, isLoggedIn: boolean) {
  return isLoggedIn ? path : `/auth?mode=signup&next=${encodeURIComponent(path)}`
}

function getCitizenLoginPath(path: string, isLoggedIn: boolean) {
  return isLoggedIn ? path : `/auth?mode=login&next=${encodeURIComponent(path)}`
}

function PublicNavbar({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <>
      <div className="bg-[linear-gradient(90deg,#ff9933_0%,#fff7ed_25%,#ffffff_55%,#ecfdf5_78%,#138808_100%)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-[11px] font-medium text-slate-700 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Landmark className="h-3.5 w-3.5" />
            <span>Official Municipal Citizen Grievance Portal</span>
          </div>
          <div className="hidden sm:block">Citizen Helpdesk: 1800-100-2024</div>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.35rem] bg-[linear-gradient(135deg,#0b3b78_0%,#1d4ed8_52%,#f59e0b_100%)] text-sm font-semibold text-white shadow-[0_20px_40px_rgba(15,59,130,0.2)]">
              GC
            </div>
            <div>
              <div className="text-xs font-semibold tracking-[0.26em] text-slate-500 uppercase">GovCRM</div>
              <div className="text-sm text-slate-600">Official Citizen Services</div>
            </div>
          </Link>

          <div className="hidden items-center gap-6 lg:flex">
            <a href="#services" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">
              Complaint Types
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">
              How It Works
            </a>
            <Link href={getCitizenLoginPath('/citizen/tracker', isLoggedIn)} className="text-sm font-medium text-slate-600 transition hover:text-slate-950">
              Track Status
            </Link>
            <Link href="/worker-login">
              <Button variant="outline" className="rounded-full border-slate-300 px-5 text-slate-700">
                Department Login
              </Button>
            </Link>
            <Link href={getCitizenPath('/citizen/submit', isLoggedIn)}>
              <Button className="rounded-full px-5">
                Raise Complaint
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <Link href={getCitizenPath('/citizen/submit', isLoggedIn)}>
              <Button className="rounded-full px-4">
                Raise Complaint
              </Button>
            </Link>
            <Link href="/worker-login">
              <Button variant="outline" className="rounded-full border-slate-300 px-4 text-slate-700">
                Department Login
              </Button>
            </Link>
          </div>
        </div>
      </header>
    </>
  )
}

export default async function Home() {
  const user = await getCurrentUser()
  const isCitizenLoggedIn = user?.role === 'citizen'
  const primaryHref = getCitizenPath('/citizen/submit', isCitizenLoggedIn)
  const secondaryHref = isCitizenLoggedIn ? '/citizen' : '/auth?mode=signup&next=%2Fcitizen%2Fsubmit'
  const trackerHref = getCitizenLoginPath('/citizen/tracker', isCitizenLoggedIn)

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <PublicNavbar isLoggedIn={isCitizenLoggedIn} />

      <main className="overflow-hidden">
        <section className="relative isolate border-b border-slate-200 bg-[linear-gradient(180deg,#f7fbff_0%,#eef4ff_42%,#f9fafb_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,78,216,0.15),transparent_26%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.10),transparent_20%),radial-gradient(circle_at_bottom_right,rgba(22,163,74,0.08),transparent_22%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-18 pt-14 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:pb-24 lg:pt-20">
            <div className="max-w-3xl">
              <Badge className="rounded-full border border-sky-200 bg-white px-4 py-1 text-sky-800 shadow-sm">
                Official citizen grievance and civic service portal
              </Badge>

              <h1 className="mt-6 text-5xl font-semibold tracking-tight text-balance text-slate-950 sm:text-6xl lg:text-[4.5rem] lg:leading-[1.03]">
                Public Grievance Portal for Citizens
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Register your complaint, track status, and receive updates from the concerned department.
                The portal is designed to be simple, reliable, and easy to use for everyday civic issues.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-[#ffd9ac] bg-[#fff7ed] px-4 py-2 text-sm font-medium text-[#9a5b00]">
                  Easy complaint registration
                </div>
                <div className="rounded-full border border-[#d7e7ff] bg-white px-4 py-2 text-sm font-medium text-[#1450b8]">
                  Ward-based complaint routing
                </div>
                <div className="rounded-full border border-[#dff5e5] bg-white px-4 py-2 text-sm font-medium text-[#167c41]">
                  Complaint ID tracking
                </div>
              </div>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href={primaryHref}>
                  <Button size="lg" className="rounded-full px-7">
                    Raise Complaint
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={secondaryHref}>
                  <Button variant="outline" size="lg" className="rounded-full px-7">
                    {isCitizenLoggedIn ? 'Open Dashboard' : 'Create Account'}
                  </Button>
                </Link>
                <Link href={trackerHref}>
                  <Button variant="ghost" size="lg" className="rounded-full px-4 text-sky-700">
                    Track Complaint
                  </Button>
                </Link>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                  <div className="text-3xl font-semibold text-slate-950">24x7</div>
                  <div className="mt-2 text-sm text-slate-600">Complaint filing available any time</div>
                </div>
                <div className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                  <div className="text-3xl font-semibold text-slate-950">Ward-Based</div>
                  <div className="mt-2 text-sm text-slate-600">Complaints reach the relevant local department</div>
                </div>
                <div className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                  <div className="text-3xl font-semibold text-slate-950">Transparent</div>
                  <div className="mt-2 text-sm text-slate-600">Status updates visible until complaint closure</div>
                </div>
              </div>

              <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-xl">
                    <div className="text-sm font-semibold tracking-[0.18em] text-sky-800 uppercase">Citizen Notice</div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      For a new complaint, create your account and submit the issue with ward details.
                      If you have already filed a complaint, you can directly track its current status.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                    <Clock3 className="h-4 w-4 text-sky-700" />
                    Public helpdesk: 1800-100-2024
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full">
              <div className="rounded-[2.2rem] border border-slate-200 bg-white p-3 shadow-[0_34px_95px_rgba(15,23,42,0.10)]">
                <div className="overflow-hidden rounded-[1.85rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
                  <div className="border-b border-slate-200 bg-[linear-gradient(90deg,#0b3b78_0%,#1d4ed8_62%,#f59e0b_100%)] px-6 py-5 text-white">
                    <div className="text-xs font-semibold tracking-[0.22em] text-white/80 uppercase">Citizen Service Access</div>
                    <div className="mt-2 text-2xl font-semibold">Use the portal without confusion</div>
                    <p className="mt-2 text-sm text-white/85">
                      The main citizen services are available here in a simple and clear format.
                    </p>
                  </div>

                  <div className="grid gap-4 p-5">
                    <div className="rounded-[1.45rem] border border-amber-200 bg-[linear-gradient(180deg,#fffaf2_0%,#ffffff_100%)] p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[#ffedd5] text-[#b45309]">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-slate-950">Official Information</div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            This portal is for citizen complaints related to roads, sanitation, water,
                            streetlights, drainage, and other civic issues.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {heroServices.map((item) => {
                        const Icon = item.icon

                        return (
                          <div key={item.title} className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-sky-50 text-sky-700">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="mt-4 text-base font-semibold text-slate-950">{item.title}</div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-3xl">
              <p className="text-sm font-semibold tracking-[0.24em] text-sky-700 uppercase">Citizen Service Categories</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-balance text-slate-950">
                Report common civic issues through the correct complaint category.
              </h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {citizenServices.map((item) => {
                const Icon = item.icon

                return (
                  <Card key={item.title} className={`rounded-[1.9rem] border-slate-200 shadow-[0_22px_60px_rgba(15,23,42,0.06)] ${item.tone}`}>
                    <CardHeader>
                      <div className={`flex h-12 w-12 items-center justify-center rounded-[1.15rem] ${item.accent}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="pt-6 text-2xl text-slate-950">{item.title}</CardTitle>
                      <CardDescription className="text-base leading-7 text-slate-600">{item.description}</CardDescription>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-slate-200 bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[2.1rem] border border-slate-200 bg-[linear-gradient(135deg,#fffdf8_0%,#f8fbff_52%,#f6fff9_100%)] p-6 shadow-[0_26px_70px_rgba(15,23,42,0.06)] sm:p-8 lg:p-10">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold tracking-[0.24em] text-sky-700 uppercase">How It Works</p>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight text-balance text-slate-950">
                  Use the portal in four simple steps.
                </h2>
              </div>

              <div className="mt-10 grid gap-4 lg:grid-cols-4">
                {processSteps.map((step, index) => (
                  <div key={step.title} className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="text-sm font-semibold tracking-[0.24em] text-amber-600 uppercase">Step {String(index + 1).padStart(2, '0')}</div>
                    <h3 className="mt-5 text-xl font-semibold text-slate-950">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_0.94fr] lg:px-8">
            <div>
              <p className="text-sm font-semibold tracking-[0.24em] text-sky-700 uppercase">Public Trust Markers</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-balance text-slate-950">
                Clear process, official access, and simple tracking for every complaint.
              </h2>

              <div className="mt-8 grid gap-4">
                {trustSignals.map((point) => (
                  <div key={point} className="flex items-center gap-3 rounded-[1.45rem] border border-slate-200 bg-white px-4 py-4 text-slate-700 shadow-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    {point}
                  </div>
                ))}
              </div>
            </div>

            <Card className="rounded-[2rem] border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_26px_75px_rgba(15,23,42,0.08)]">
              <CardHeader>
                <CardDescription>Access and Support</CardDescription>
                <CardTitle className="text-3xl text-slate-950">Choose the service you need</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <Users className="mt-0.5 h-5 w-5 text-sky-700" />
                    <div>
                      <div className="font-semibold text-slate-950">Citizen Access</div>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        New users can create an account, and existing users can directly raise complaints and track status.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <PhoneCall className="mt-0.5 h-5 w-5 text-amber-600" />
                    <div>
                      <div className="font-semibold text-slate-950">Department Access</div>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Staff and department users should sign in through the separate department login page.
                      </p>
                    </div>
                  </div>
                </div>

                <Link href={primaryHref} className="block">
                  <Button size="lg" className="w-full rounded-full">
                    Raise Complaint
                  </Button>
                </Link>
                <Link href={isCitizenLoggedIn ? '/citizen' : '/auth?mode=signup&next=%2Fcitizen'} className="block">
                  <Button variant="outline" size="lg" className="w-full rounded-full">
                    {isCitizenLoggedIn ? 'Open Citizen Dashboard' : 'Create Account'}
                  </Button>
                </Link>
                <Link href={trackerHref} className="block">
                  <Button variant="ghost" size="lg" className="w-full rounded-full text-sky-700">
                    Track Existing Complaint
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  )
}
