'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, Landmark, LockKeyhole, Shield, ShieldCheck, UserCog } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

const panelCredentials = [
  {
    role: 'Rohini Worker',
    description: 'For Rohini ward complaint handling and status updates.',
    email: 'worker.rohini@govcrm.demo',
    password: 'changeme',
    icon: BriefcaseBusiness,
    accent: 'bg-[#dcfce7] text-[#166534]',
  },
  {
    role: 'Dwarka Worker',
    description: 'For Dwarka ward complaint handling and status updates.',
    email: 'worker.dwarka@govcrm.demo',
    password: 'changeme',
    icon: BriefcaseBusiness,
    accent: 'bg-[#dbeafe] text-[#1d4ed8]',
  },
  {
    role: 'Saket Worker',
    description: 'For Saket ward complaint handling and status updates.',
    email: 'worker.saket@govcrm.demo',
    password: 'changeme',
    icon: BriefcaseBusiness,
    accent: 'bg-[#e0f2fe] text-[#0369a1]',
  },
  {
    role: 'Laxmi Nagar Worker',
    description: 'For Laxmi Nagar ward complaint handling and status updates.',
    email: 'worker.laxmi@govcrm.demo',
    password: 'changeme',
    icon: BriefcaseBusiness,
    accent: 'bg-[#ede9fe] text-[#6d28d9]',
  },
  {
    role: 'Karol Bagh Worker',
    description: 'For Karol Bagh ward complaint handling and status updates.',
    email: 'worker.karol@govcrm.demo',
    password: 'changeme',
    icon: BriefcaseBusiness,
    accent: 'bg-[#fce7f3] text-[#be185d]',
  },
  {
    role: 'Admin Panel',
    description: 'For queue oversight, analytics, and user management.',
    email: 'admin@govcrm.demo',
    password: 'changeme',
    icon: UserCog,
    accent: 'bg-[#dbeafe] text-[#1d4ed8]',
  },
  {
    role: 'Leader Panel',
    description: 'For executive reporting, ward trends, and high-level monitoring.',
    email: 'leader@govcrm.demo',
    password: 'changeme',
    icon: Shield,
    accent: 'bg-[#ffedd5] text-[#b45309]',
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
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ecf3ff_48%,#f7f8fb_100%)]">
      <div className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Landmark className="h-3.5 w-3.5 text-amber-300" />
            <span>Official Department Access</span>
          </div>
          <div className="text-slate-300">Worker, admin, and leadership access only</div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:px-8 lg:py-16">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" />
            Back to citizen home
          </Link>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
            <LockKeyhole className="h-4 w-4" />
            Department account sign in
          </div>

          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-slate-950">
            Separate sign in for workers and department users
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            This page is only for internal users. Citizens should use the public portal to create an account,
            raise complaints, and track complaint status.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.18em] text-sky-700 uppercase">
                <ShieldCheck className="h-4 w-4" />
                Internal Use
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Use your assigned department credentials to open the worker, admin, or leader panel.
              </p>
            </div>
            <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.18em] text-amber-700 uppercase">
                <Landmark className="h-4 w-4" />
                Citizen Guidance
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                If you are a citizen, return to the public portal and create your account first.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold tracking-[0.18em] text-sky-700 uppercase">Department Accounts</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Select the relevant internal account below. This keeps department access separate from the public citizen portal.
                </p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
                Official access only
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {panelCredentials.map((panel) => {
              const Icon = panel.icon;

              return (
                <div key={panel.role} className="rounded-[1.45rem] border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] ${panel.accent}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-slate-950">{panel.role}</div>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{panel.description}</p>
                        <div className="mt-3 truncate text-sm text-slate-700">{panel.email}</div>
                        <div className="text-sm text-slate-700">Password: {panel.password}</div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 rounded-full"
                      onClick={() => setForm({ email: panel.email, password: panel.password })}
                    >
                      Use
                    </Button>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </div>

        <div className="self-start lg:sticky lg:top-28">
          <Card className="mx-auto w-full max-w-xl rounded-[2rem] border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <CardHeader>
              <CardDescription>Internal credentials only</CardDescription>
              <CardTitle className="text-3xl text-slate-950">Department Sign In</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="rounded-[1.3rem] border border-sky-100 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-4 text-sm text-slate-600">
                  Enter the official worker or panel credentials below. Public users should use the citizen portal instead.
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="h-11"
                    placeholder="panel email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    className="h-11"
                    placeholder="panel password"
                    required
                  />
                </div>

                <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Need citizen access? Use the citizen portal to create your account first and then sign in there.
                </div>

                <Button type="submit" className="h-12 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800" disabled={loading}>
                  {loading ? <Spinner label="Signing in..." /> : 'Open Department Panel'}
                </Button>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    <div className="font-semibold text-slate-950">Secure Internal Access</div>
                    <p className="mt-1 leading-6">Department access is kept separate so public users do not see internal credentials.</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    <div className="font-semibold text-slate-950">Role-Based Login</div>
                    <p className="mt-1 leading-6">Workers, admin, and leadership users are routed to the correct panel after sign in.</p>
                  </div>
                </div>

                <div className="text-center text-sm text-slate-600">
                  Looking for resident access?{' '}
                  <Link href="/auth?mode=signup" className="font-semibold text-sky-700 underline-offset-4 hover:underline">
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
              <div key={point} className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
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
