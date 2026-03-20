import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Building2,
  CheckCircle2,
  CircleHelp,
  ClipboardPlus,
  Landmark,
  MapPin,
  Menu,
  PhoneCall,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const navItems = [
  { label: 'Raise Complaint', href: '/citizen/submit' },
  { label: 'Track Complaint', href: '/citizen/tracker' },
  { label: 'Citizen Services', href: '#services' },
  { label: 'How It Works', href: '#process' },
  { label: 'Support', href: '#support' },
]

const quickActions = [
  {
    title: 'Raise Complaint',
    description: 'Submit a new municipal complaint with category and location details.',
    href: '/citizen/submit',
    icon: ClipboardPlus,
    tone: 'from-[#fff7ed] to-[#ffffff]',
    iconTone: 'bg-[#fff1df] text-[#c26a00]',
    primary: true,
  },
  {
    title: 'Track Complaint Status',
    description: 'Follow complaint progress from submission to final resolution.',
    href: '/citizen/tracker',
    icon: SearchCheck,
    tone: 'from-[#eff6ff] to-[#ffffff]',
    iconTone: 'bg-[#e0edff] text-[#1450b8]',
  },
  {
    title: 'Worker Login',
    description: 'Secure entry for municipal workers and field staff only.',
    href: '/worker-login',
    icon: Users,
    tone: 'from-[#f0fdf4] to-[#ffffff]',
    iconTone: 'bg-[#dcfce7] text-[#15803d]',
  },
]

const serviceCards = [
  {
    title: 'Roads and Street Safety',
    description: 'Potholes, road damage, open drains, footpath issues, unsafe crossings, and missing signage.',
    icon: Building2,
  },
  {
    title: 'Water, Drainage, and Sanitation',
    description: 'Water leakage, sewer blockage, drainage overflow, waste collection, and cleanliness concerns.',
    icon: ShieldCheck,
  },
  {
    title: 'Lighting and Public Utilities',
    description: 'Streetlight failure, electric hazards, utility interruptions, and other civic maintenance issues.',
    icon: BellRing,
  },
]

const processSteps = [
  {
    step: '01',
    title: 'Complaint Registration',
    description: 'Citizen enters the issue type, location, and a short description.',
  },
  {
    step: '02',
    title: 'Department Assignment',
    description: 'The system routes the complaint to the concerned municipal team or ward.',
  },
  {
    step: '03',
    title: 'Field Resolution',
    description: 'Workers act on the complaint and update progress transparently.',
  },
  {
    step: '04',
    title: 'Status Tracking',
    description: 'Citizen sees updates until the complaint is resolved and closed.',
  },
]

const trustPoints = [
  'Simple citizen-first navigation with clear complaint actions.',
  'Separate worker login without exposing internal panels publicly.',
  'Formal and government-friendly visual language with a clean light UI.',
  'Responsive layout designed for mobile, tablet, and desktop access.',
]

const civicPromises = [
  {
    title: 'Guided Public Filing',
    description: 'The complaint journey is designed around plain-language steps so citizens can submit issues without confusion.',
    icon: ClipboardPlus,
    tone: 'from-[#fff7ed] to-[#ffffff]',
    iconTone: 'bg-[#fff1df] text-[#c26a00]',
  },
  {
    title: 'Location and Evidence Ready',
    description: 'Complaints support live location, landmark details, and supporting files for faster ground action.',
    icon: MapPin,
    tone: 'from-[#eff6ff] to-[#ffffff]',
    iconTone: 'bg-[#e0edff] text-[#1450b8]',
  },
  {
    title: 'Secure Worker Access',
    description: 'Internal workspaces stay separate so the public portal remains clean while staff use dedicated login access.',
    icon: Users,
    tone: 'from-[#f0fdf4] to-[#ffffff]',
    iconTone: 'bg-[#dcfce7] text-[#15803d]',
  },
]

const serviceAssurances = [
  'Raise a complaint in a few guided steps',
  'Use current location when permission is allowed',
  'Upload photos or PDF proof with the complaint',
]

function PublicNavbar() {
  return (
    <>
      <div className="bg-[linear-gradient(90deg,#ff9933_0%,#fff7ed_35%,#ffffff_60%,#ecfdf5_82%,#138808_100%)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-[11px] font-medium text-slate-700 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Landmark className="h-3.5 w-3.5 text-slate-700" />
            <span>Digital Public Grievance and Municipal Services Portal</span>
          </div>
          <div className="hidden sm:block">Citizen Helpdesk and Portal Support: 1800-100-2024</div>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-[1.35rem] bg-[linear-gradient(135deg,#0f3b82_0%,#1d4ed8_55%,#f59e0b_100%)] text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,59,130,0.22)]">
              GC
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.24em] text-slate-500 uppercase">
                GovCRM
              </div>
              <div className="text-sm text-slate-600">Citizen Complaint Portal</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/worker-login">
              <Button variant="outline" className="rounded-full px-5">
                Worker Login
              </Button>
            </Link>
            <Link href="/citizen/submit">
              <Button className="rounded-full px-5">Raise Complaint</Button>
            </Link>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="border-slate-200 bg-white">
              <SheetHeader className="px-0">
                <SheetTitle>GovCRM</SheetTitle>
                <SheetDescription>
                  Citizen-friendly public portal with separate worker access.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-8 space-y-3">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    {item.label}
                  </a>
                ))}
              </div>

              <div className="mt-8 grid gap-3">
                <Link href="/citizen/submit">
                  <Button className="w-full rounded-full">Raise Complaint</Button>
                </Link>
                <Link href="/worker-login">
                  <Button variant="outline" className="w-full rounded-full">
                    Worker Login
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950">
      <PublicNavbar />

      <main className="overflow-hidden">
        <section className="relative isolate border-b border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_42%,#f6f8fc_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,78,216,0.14),transparent_26%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.10),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(19,136,8,0.08),transparent_22%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,59,130,0.03)_1px,transparent_1px),linear-gradient(180deg,rgba(15,59,130,0.03)_1px,transparent_1px)] bg-[size:72px_72px]" />

          <div className="relative mx-auto grid max-w-7xl gap-14 px-4 pb-18 pt-16 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:pb-24 lg:pt-24">
            <div className="max-w-3xl">
              <Badge className="rounded-full border border-sky-200 bg-white px-4 py-1 text-sky-800 shadow-sm">
                Government-friendly online grievance filing for citizens
              </Badge>

              <h1 className="mt-7 text-5xl font-semibold tracking-tight text-balance text-slate-950 sm:text-6xl lg:text-[4.6rem] lg:leading-[1.02]">
                Raise civic complaints online with a portal built for public trust.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Submit complaints, share location, attach supporting proof, and track department
                action through a clean municipal interface. Public services stay easy to find, while
                workers use a separate secure login outside the citizen experience.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-[#ffd7a8] bg-[#fff7ed] px-4 py-2 text-sm font-medium text-[#9a5b00]">
                  Public Grievance Redressal
                </div>
                <div className="rounded-full border border-[#d7e6ff] bg-white px-4 py-2 text-sm font-medium text-[#1450b8]">
                  Location Enabled Complaints
                </div>
                <div className="rounded-full border border-[#dff5e5] bg-white px-4 py-2 text-sm font-medium text-[#167c41]">
                  Evidence Upload Support
                </div>
              </div>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/citizen/submit">
                  <Button size="lg" className="rounded-full px-7">
                    Raise a Complaint
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/citizen/tracker">
                  <Button variant="outline" size="lg" className="rounded-full px-7">
                    Track Complaint
                  </Button>
                </Link>
                <Link href="/worker-login">
                  <Button variant="outline" size="lg" className="rounded-full px-7">
                    Worker Login
                  </Button>
                </Link>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                  <div className="text-3xl font-semibold text-slate-950">24x7</div>
                  <div className="mt-2 text-sm text-slate-600">Citizen complaint submission access</div>
                </div>
                <div className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                  <div className="text-3xl font-semibold text-slate-950">Map Ready</div>
                  <div className="mt-2 text-sm text-slate-600">Supports live location and landmark details</div>
                </div>
                <div className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                  <div className="text-3xl font-semibold text-slate-950">Trackable</div>
                  <div className="mt-2 text-sm text-slate-600">Follow updates until final resolution</div>
                </div>
              </div>
            </div>

            <div id="quick-actions" className="w-full">
              <div className="rounded-[2.2rem] border border-slate-200 bg-white p-3 shadow-[0_34px_95px_rgba(15,23,42,0.10)]">
                <div className="overflow-hidden rounded-[1.85rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
                  <div className="border-b border-slate-200 bg-[linear-gradient(90deg,#0f3b82_0%,#1d4ed8_62%,#f59e0b_100%)] px-6 py-5 text-white">
                    <div className="text-xs font-semibold tracking-[0.22em] text-white/80 uppercase">
                      Citizen Service Desk
                    </div>
                    <div className="mt-2 text-2xl font-semibold">Start from the right action</div>
                    <p className="mt-2 max-w-lg text-sm text-white/80">
                      The most important services are visible on the first screen so citizens can
                      act immediately without searching around the portal.
                    </p>
                  </div>

                  <div className="grid gap-4 p-5">
                    {quickActions.map((action) => {
                      const Icon = action.icon

                      return (
                        <Link key={action.title} href={action.href}>
                          <div
                            className={`group rounded-[1.6rem] border border-slate-200 bg-gradient-to-r ${action.tone} p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_35px_rgba(15,23,42,0.08)]`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-start gap-4">
                                <div
                                  className={`flex h-12 w-12 items-center justify-center rounded-[1rem] ${action.iconTone}`}
                                >
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold text-slate-950">{action.title}</h3>
                                    {action.primary ? (
                                      <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-semibold tracking-[0.2em] text-white uppercase">
                                        Main Action
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                                    {action.description}
                                  </p>
                                </div>
                              </div>
                              <div className="hidden rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm sm:block">
                                Open
                              </div>
                            </div>
                          </div>
                        </Link>
                      )
                    })}

                    <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.22em] text-slate-500 uppercase">
                        <BadgeCheck className="h-4 w-4 text-emerald-600" />
                        Service Assurances
                      </div>
                      <div className="mt-4 grid gap-3">
                        {serviceAssurances.map((item) => (
                          <div
                            key={item}
                            className="flex items-center gap-3 rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold tracking-[0.24em] text-sky-700 uppercase">
                  Public Portal Standards
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-slate-950">
                  Built like a real citizen service portal, not an internal dashboard.
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-slate-600">
                The public interface keeps the journey clean, official-looking, and easy to
                understand for citizens across mobile and desktop.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {civicPromises.map((item) => {
                const Icon = item.icon

                return (
                <div
                  key={item.title}
                  className={`rounded-[1.7rem] border border-slate-200 bg-gradient-to-br ${item.tone} px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)]`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.iconTone} shadow-sm`}>
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

        <section id="services" className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold tracking-[0.24em] text-sky-700 uppercase">
                  Citizen Services
                </p>
                <h2 className="mt-4 text-4xl font-semibold tracking-tight text-balance">
                  Clear complaint categories for common municipal issues.
                </h2>
              </div>
              <p className="max-w-xl text-slate-600">
                The landing page is structured to guide citizens into the correct action quickly
                without exposing complex internal workflows.
              </p>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {serviceCards.map(({ title, description, icon: Icon }) => (
                <Card
                  key={title}
                  className="rounded-[1.9rem] border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.06)]"
                >
                  <CardHeader>
                    <div className="flex h-12 w-12 items-center justify-center rounded-[1.15rem] bg-[linear-gradient(135deg,#0f3b82_0%,#1d4ed8_100%)] text-white shadow-[0_14px_28px_rgba(15,59,130,0.18)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="pt-6 text-2xl text-slate-950">{title}</CardTitle>
                    <CardDescription className="text-base leading-7 text-slate-600">
                      {description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="process" className="border-y border-slate-200 bg-white py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[2.2rem] border border-slate-200 bg-[linear-gradient(135deg,#fffdf8_0%,#f8fbff_50%,#f6fff9_100%)] p-6 shadow-[0_26px_70px_rgba(15,23,42,0.06)] sm:p-8 lg:p-10">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold tracking-[0.24em] text-sky-700 uppercase">
                    Complaint Process
                  </p>
                  <h2 className="mt-4 text-4xl font-semibold tracking-tight text-balance text-slate-950">
                    A simple public process from complaint filing to closure.
                  </h2>
                </div>
                <p className="max-w-xl text-slate-600">
                  Citizens should immediately understand how the system works. Each step below
                  reflects the real journey of a complaint in the portal.
                </p>
              </div>

              <div className="mt-10 grid gap-4 lg:grid-cols-4">
                {processSteps.map((step) => (
                  <div
                    key={step.step}
                    className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="text-sm font-semibold tracking-[0.24em] text-amber-600 uppercase">
                      Step {step.step}
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-slate-950">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="support" className="py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_0.94fr] lg:px-8">
            <div>
              <p className="text-sm font-semibold tracking-[0.24em] text-sky-700 uppercase">
                Public Confidence
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-balance">
                Official-looking, user-friendly, and ready for real public use.
              </h2>

              <div className="mt-8 grid gap-4">
                {trustPoints.map((point) => (
                  <div
                    key={point}
                    className="flex items-center gap-3 rounded-[1.45rem] border border-slate-200 bg-white px-4 py-4 text-slate-700 shadow-sm"
                  >
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    {point}
                  </div>
                ))}
              </div>
            </div>

            <Card className="rounded-[2rem] border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_26px_75px_rgba(15,23,42,0.08)]">
              <CardHeader>
                <CardDescription>Support and Access</CardDescription>
                <CardTitle className="text-3xl text-slate-950">
                  Start from the correct portal.
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-5 w-5 text-sky-700" />
                    <div>
                      <div className="font-semibold text-slate-950">Citizen Portal</div>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Raise complaints, upload proof, use map location, and check progress
                        through the public interface.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <PhoneCall className="mt-0.5 h-5 w-5 text-amber-600" />
                    <div>
                      <div className="font-semibold text-slate-950">Worker Access</div>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Municipal staff and field workers should use the separate login for secure
                        operations access.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <CircleHelp className="mt-0.5 h-5 w-5 text-slate-700" />
                    <div>
                      <div className="font-semibold text-slate-950">Citizen Helpdesk</div>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Helpline support for portal assistance and complaint guidance: 1800-100-2024.
                      </p>
                    </div>
                  </div>
                </div>

                <Link href="/citizen/submit" className="block">
                  <Button size="lg" className="w-full rounded-full">
                    Raise a Complaint
                  </Button>
                </Link>
                <Link href="/worker-login" className="block">
                  <Button variant="outline" size="lg" className="w-full rounded-full">
                    Worker Login
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
