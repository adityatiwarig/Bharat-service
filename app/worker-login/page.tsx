'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Landmark, LockKeyhole, Shield, UserCog, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

const panels = [
  {
    title: 'L1 Dashboard',
    description: 'Initial complaint handling for mapped ward and department complaints.',
    icon: Users,
  },
  {
    title: 'L2 Dashboard',
    description: 'Escalated complaints that were manually forwarded from L1.',
    icon: Shield,
  },
  {
    title: 'L3 Dashboard',
    description: 'Final officer escalation queue before administrative intervention.',
    icon: UserCog,
  },
  {
    title: 'Admin Panel',
    description: 'System-wide monitoring and administrative control for officer operations.',
    icon: Landmark,
  },
];

export default function WorkerLoginPage() {
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    fetch('/api/session/me', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return response.json() as Promise<{ user?: { redirect_to?: string } }>;
      })
      .then((data) => {
        if (data?.user?.redirect_to) {
          window.location.replace(data.user.redirect_to);
        }
      })
      .finally(() => setCheckingSession(false));
  }, []);

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
        redirect_to?: string;
        user?: { redirect_to?: string };
      };

      if (!response.ok) {
        throw new Error(data.error || 'Unable to login.');
      }

      const redirectTo = data.redirect_to || data.user?.redirect_to || '/admin';
      toast.success('Officer login successful.');
      window.location.assign(redirectTo);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to login.');
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_52%,#f6f8fc_100%)]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white px-6 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <Spinner label="Checking your session..." />
        </div>
      </div>
    );
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
            <span className="font-semibold tracking-[0.08em] uppercase">Official Officer Access</span>
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
            JWT-secured officer and admin login
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#111827] lg:text-5xl">
            Single login for L1, L2, L3, and Admin panels
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#475569]">
            Officer accounts are created directly from mapping data. Use the generated credentials TXT file and sign in with either the short Login ID or the full seeded email.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {panels.map((panel) => {
              const Icon = panel.icon;

              return (
                <div key={panel.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-sky-50 text-sky-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-4 text-lg font-semibold text-slate-950">{panel.title}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{panel.description}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold tracking-[0.18em] text-sky-800 uppercase">Seeded Officer Format</div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Officer logins are unique per role, ward, department, and category. The generated pattern is:
              {' '}
              <span className="font-semibold text-slate-900">`l1_ward_department_category`</span>
              {' '}
              or
              {' '}
              <span className="font-semibold text-slate-900">`l1_ward_department_category@crm.com`</span>.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              A ready-to-share file is generated at
              {' '}
              <span className="font-semibold text-slate-900">`OFFICER_LOGIN_CREDENTIALS.txt`</span>
              {' '}
              with officer name, login ID, full email, password, and mapping scope.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Default seeded password is
              {' '}
              <span className="font-semibold text-slate-900">`123456`</span>
              {' '}
              until you rotate it.
            </p>
          </div>
        </div>

        <div className="self-start lg:sticky lg:top-24">
          <Card className="mx-auto w-full max-w-xl rounded-[1.5rem] border-[#d1d5db] bg-white shadow-none">
            <CardHeader className="border-b border-[#e5e7eb]">
              <CardDescription className="text-sm text-[#64748b]">Officer credentials only</CardDescription>
              <CardTitle className="text-3xl font-bold text-[#111827]">Officer Sign In</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="rounded-[1.25rem] border border-[#dbeafe] bg-[#f8fbff] px-4 py-4 text-sm leading-6 text-[#475569]">
                  After successful login, the API returns a JWT session and redirects automatically:
                  L1 to ` /l1`, L2 to ` /l2`, L3 to ` /l3`, and ADMIN to ` /admin`.
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-[#111827]">
                    Login ID or Email
                  </Label>
                  <Input
                    id="email"
                    type="text"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="h-11 rounded-xl border-[#cbd5e1] bg-white text-[#111827] placeholder:text-[#94a3b8] focus-visible:border-[#0b3d91] focus-visible:ring-[#0b3d91]"
                    placeholder="l1_rohini_sector_1_cleanliness_dead_animals"
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
                    className="h-11 rounded-xl border-[#cbd5e1] bg-white text-[#111827] placeholder:text-[#94a3b8] focus-visible:border-[#0b3d91] focus-visible:ring-[#0b3d91]"
                    placeholder="Enter officer password"
                    required
                  />
                </div>

                <Button type="submit" className="h-12 w-full rounded-full bg-[#0b3d91] text-white hover:bg-[#082f6b]" disabled={loading}>
                  {loading ? <Spinner label="Signing in..." /> : 'Proceed to Officer Panel'}
                </Button>

                <div className="rounded-[1.25rem] border border-[#e5e7eb] bg-[#f8fafc] px-4 py-4 text-sm leading-6 text-[#475569]">
                  Citizens should continue using the public portal. This page is only for L1, L2, L3, and admin officer accounts.
                </div>

                <div className="text-center text-sm text-[#475569]">
                  Looking for citizen access?{' '}
                  <Link href="/auth?mode=signup" className="font-semibold text-[#0b3d91] underline-offset-4 hover:underline">
                    Go to Citizen Portal
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
