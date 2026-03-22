'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, Landmark, LockKeyhole, Shield, UserCog } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type InternalRole = 'worker' | 'admin' | 'leader';

type DemoCredential = {
  name: string;
  email: string;
  password: string;
  note: string;
};

type RoleSection = {
  id: InternalRole;
  label: string;
  description: string;
  detailTitle: string;
  detailText: string;
  icon: typeof BriefcaseBusiness;
  accounts: DemoCredential[];
};

const roleSections: RoleSection[] = [
  {
    id: 'worker',
    label: 'Worker',
    description: 'Ward-level complaint handling and field status updates.',
    detailTitle: 'Worker Access',
    detailText:
      'Use the assigned ward-level credentials below for complaint handling, updates, and operational follow-up.',
    icon: BriefcaseBusiness,
    accounts: [
      {
        name: 'Rohini Worker',
        email: 'worker.rohini@govcrm.demo',
        password: 'changeme',
        note: 'For Rohini ward complaint handling and status updates.',
      },
      {
        name: 'Dwarka Worker',
        email: 'worker.dwarka@govcrm.demo',
        password: 'changeme',
        note: 'For Dwarka ward complaint handling and status updates.',
      },
      {
        name: 'Saket Worker',
        email: 'worker.saket@govcrm.demo',
        password: 'changeme',
        note: 'For Saket ward complaint handling and status updates.',
      },
      {
        name: 'Laxmi Nagar Worker',
        email: 'worker.laxmi@govcrm.demo',
        password: 'changeme',
        note: 'For Laxmi Nagar ward complaint handling and status updates.',
      },
      {
        name: 'Karol Bagh Worker',
        email: 'worker.karol@govcrm.demo',
        password: 'changeme',
        note: 'For Karol Bagh ward complaint handling and status updates.',
      },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Queue oversight, analytics, and user administration.',
    detailTitle: 'Administrative Access',
    detailText:
      'Use the administrative credentials below for queue oversight, analytics review, and user management functions.',
    icon: UserCog,
    accounts: [
      {
        name: 'Admin Panel',
        email: 'admin@govcrm.demo',
        password: 'changeme',
        note: 'For queue oversight, analytics, and user management.',
      },
    ],
  },
  {
    id: 'leader',
    label: 'Department Head',
    description: 'Department-wide review, routing oversight, and fallback assignment.',
    detailTitle: 'Department Head Access',
    detailText:
      'Use the department head credentials below for routing oversight, cross-department review, and assignment fallback.',
    icon: Shield,
    accounts: [
      {
        name: 'Central Dept Head Panel',
        email: 'leader@govcrm.demo',
        password: 'changeme',
        note: 'For cross-department complaint review, routing oversight, and worker assignment fallback.',
      },
    ],
  },
];

function getHomeByRole(role: string) {
  if (role === 'worker') return '/worker';
  if (role === 'admin') return '/admin';
  if (role === 'leader') return '/leader';
  return '/citizen';
}

export default function WorkerLoginPage() {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<InternalRole>('worker');
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const selectedSection = roleSections.find((section) => section.id === selectedRole) ?? roleSections[0];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/session/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, portal: 'internal' }),
      });

      const data = (await response.json()) as {
        error?: string;
        user?: { role: string };
      };

      if (!response.ok || !data.user) {
        throw new Error(data.error || 'Unable to login.');
      }

      toast.success('Internal panel login successful.');
      window.location.assign(getHomeByRole(data.user.role));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="flex h-1.5 w-full">
        <div className="flex-1 bg-[#ff9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      <div className="border-b border-[#cbd5e1] bg-[#0b3d91] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-[#fbbf24]" />
            <span className="font-semibold tracking-[0.08em] uppercase">Official Department Access</span>
          </div>
          <div className="text-white/90">Authorized Personnel Only</div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-10">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#334155] transition hover:text-[#0b3d91]">
            <ArrowLeft className="h-4 w-4" />
            Back to citizen home
          </Link>

          <div className="mt-5 inline-flex items-center gap-2 rounded-sm border border-[#cbd5e1] bg-white px-3 py-2 text-sm text-[#334155]">
            <LockKeyhole className="h-4 w-4 text-[#0b3d91]" />
            Department account sign in
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#111827] lg:text-5xl">
            Separate sign in for workers and department users
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#475569]">
            This page is restricted to internal users. Select the applicable role below and use the listed official
            credentials for testing. Citizens are advised to use the public portal for complaint registration and
            status tracking.
          </p>

          <div className="mt-7 rounded-sm border border-[#d1d5db] bg-white">
            <div className="border-b border-[#e5e7eb] px-5 py-4">
              <div className="text-xs font-semibold tracking-[0.18em] text-[#0b3d91] uppercase">Role Selection</div>
              <p className="mt-2 text-sm leading-6 text-[#475569]">
                Choose the relevant role to view its access note and demo credentials.
              </p>
            </div>

            <div className="p-5">
              <div className="space-y-3">
                {roleSections.map((section) => {
                  const Icon = section.icon;
                  const isActive = selectedRole === section.id;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setSelectedRole(section.id)}
                      className={`w-full rounded-sm border px-4 py-4 text-left transition ${
                        isActive
                          ? 'border-[#0b3d91] bg-[#eff6ff]'
                          : 'border-[#e5e7eb] bg-white hover:border-[#93c5fd] hover:bg-[#f8fbff]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border ${
                            isActive
                              ? 'border-[#bfdbfe] bg-white text-[#0b3d91]'
                              : 'border-[#cbd5e1] bg-[#f8fafc] text-[#475569]'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-semibold text-[#111827]">{section.label}</span>
                            {isActive ? (
                              <span className="rounded-sm border border-[#bfdbfe] bg-white px-2 py-0.5 text-[11px] font-medium text-[#0b3d91]">
                                Selected
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-[#475569]">{section.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 rounded-sm border border-[#e5e7eb] bg-[#f8fafc]">
                <div className="flex items-center justify-between gap-3 border-b border-[#e5e7eb] px-4 py-3">
                  <div>
                    <div className="text-xs font-semibold tracking-[0.18em] text-[#0b3d91] uppercase">
                      {selectedSection.detailTitle}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#64748b]">Demo Credentials (For Testing Only)</p>
                  </div>
                  <div className="rounded-sm border border-[#cbd5e1] bg-white px-3 py-1 text-xs font-medium text-[#334155]">
                    Official access only
                  </div>
                </div>

                <div className="px-4 py-4">
                  <p className="text-sm leading-6 text-[#475569]">{selectedSection.detailText}</p>

                  <div className="mt-4 space-y-3">
                    {selectedSection.accounts.map((account) => (
                      <div key={account.email} className="rounded-sm border border-[#e5e7eb] bg-white px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#111827]">{account.name}</div>
                            <p className="mt-1 text-sm leading-6 text-[#475569]">{account.note}</p>
                            <div className="mt-3 text-sm text-[#334155]">{account.email}</div>
                            <div className="mt-1 text-xs text-[#64748b]">Password: {account.password}</div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="shrink-0 rounded-sm border-[#cbd5e1] bg-white text-[#0b3d91] hover:bg-[#eff6ff] hover:text-[#0b3d91]"
                            onClick={() => setForm({ email: account.email, password: account.password })}
                          >
                            Use
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-sm border border-[#e5e7eb] bg-white px-4 py-4 text-sm leading-6 text-[#475569]">
                    Additional seeded accounts follow the internal patterns `leader.department@govcrm.demo` and
                    `worker.department.ward@govcrm.demo`, all with password `changeme`.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="self-start lg:sticky lg:top-24">
          <Card className="mx-auto w-full max-w-xl rounded-sm border-[#d1d5db] bg-white shadow-none">
            <CardHeader className="border-b border-[#e5e7eb]">
              <CardDescription className="text-sm text-[#64748b]">Authorized departmental credentials only</CardDescription>
              <CardTitle className="text-3xl font-bold text-[#111827]">Department Sign In</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="rounded-sm border border-[#dbeafe] bg-[#f8fbff] px-4 py-4 text-sm leading-6 text-[#475569]">
                  Selected role: <span className="font-semibold text-[#0b3d91]">{selectedSection.label}</span>. Enter
                  the official credentials below. Unauthorized access is strictly prohibited.
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-[#111827]">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="h-11 rounded-sm border-[#cbd5e1] bg-white text-[#111827] placeholder:text-[#94a3b8] focus-visible:border-[#0b3d91] focus-visible:ring-[#0b3d91]"
                    placeholder="Enter panel email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-[#111827]">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    className="h-11 rounded-sm border-[#cbd5e1] bg-white text-[#111827] placeholder:text-[#94a3b8] focus-visible:border-[#0b3d91] focus-visible:ring-[#0b3d91]"
                    placeholder="Enter panel password"
                    required
                  />
                </div>

                <div className="rounded-sm border border-[#e5e7eb] bg-[#f8fafc] px-4 py-4 text-sm leading-6 text-[#475569]">
                  Citizens are advised to use the public portal to create an account first and then sign in there.
                </div>

                <Button type="submit" className="h-12 w-full rounded-sm bg-[#0b3d91] text-white hover:bg-[#082f6b]" disabled={loading}>
                  {loading ? <Spinner label="Signing in..." /> : 'Proceed to Secure Login'}
                </Button>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-sm border border-[#e5e7eb] bg-[#f8fafc] px-4 py-4 text-sm text-[#475569]">
                    <div className="font-semibold text-[#111827]">Secure Internal Access</div>
                    <p className="mt-1 leading-6">Department access is maintained separately so public users do not see internal credentials.</p>
                  </div>
                  <div className="rounded-sm border border-[#e5e7eb] bg-[#f8fafc] px-4 py-4 text-sm text-[#475569]">
                    <div className="font-semibold text-[#111827]">Role-Based Login</div>
                    <p className="mt-1 leading-6">Workers, admin, and department head users are routed to the appropriate panel after sign in.</p>
                  </div>
                </div>

                <div className="text-center text-sm text-[#475569]">
                  Looking for resident access?{' '}
                  <Link href="/auth?mode=signup" className="font-semibold text-[#0b3d91] underline-offset-4 hover:underline">
                    Go to Citizen Portal
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mx-auto mt-4 grid w-full max-w-xl gap-3 sm:grid-cols-2">
            {[
              'Official access is limited to department and panel users only.',
              'Use the listed credentials or your assigned internal account to continue.',
            ].map((point) => (
              <div key={point} className="rounded-sm border border-[#e5e7eb] bg-white px-4 py-4 text-sm text-[#475569]">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#166534]" />
                  <span>{point}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
