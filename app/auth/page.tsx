'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Landmark,
  LockKeyhole,
  MapPinned,
  SearchCheck,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { fetchWards } from '@/lib/client/complaints';
import type { Ward } from '@/lib/types';

function getHomeByRole(role: string) {
  if (role === 'worker') return '/worker';
  if (role === 'admin') return '/admin';
  if (role === 'leader') return '/leader';
  return '/citizen';
}

function getSafeNextPath(nextPath: string | null, fallback: string) {
  if (!nextPath || !nextPath.startsWith('/')) {
    return fallback;
  }

  return nextPath;
}

const processSteps = [
  {
    title: 'Create your account',
    description: 'Register once with your basic details to unlock citizen services.',
    icon: UserRound,
  },
  {
    title: 'Raise complaint',
    description: 'Submit a grievance with ward and category details in a guided flow.',
    icon: LockKeyhole,
  },
  {
    title: 'Track status',
    description: 'Review progress, department action, and updates using your account.',
    icon: SearchCheck,
  },
];

const featureBadges = [
  'Easy Complaint Registration',
  'Track Complaint Status',
  'Ward-Based Routing',
];

const trustPoints = [
  'One account can be used for complaint registration and status tracking.',
  'Your selected ward and contact details remain available for future use.',
  'Citizen access is kept separate from internal departmental systems.',
];

function sanitizeIndianPhoneInput(value: string) {
  const digits = value.replace(/\D/g, '');

  if (digits.startsWith('91') && digits.length > 10) {
    return digits.slice(2, 12);
  }

  if (digits.startsWith('0') && digits.length > 10) {
    return digits.slice(1, 11);
  }

  return digits.slice(0, 10);
}

function formatCitizenPhone(phone: string) {
  const digits = sanitizeIndianPhoneInput(phone);
  return digits ? `+91${digits}` : '';
}

function CitizenAuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loadingWards, setLoadingWards] = useState(true);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
  });

  const visibleWards = wards.slice(0, 6);
  const remainingWardCount = Math.max(wards.length - visibleWards.length, 0);

  useEffect(() => {
    const requestedMode = searchParams.get('mode');
    setMode(requestedMode === 'login' ? 'login' : 'signup');
  }, [searchParams]);

  useEffect(() => {
    const nextPath = getSafeNextPath(searchParams.get('next'), '/citizen');

    fetch('/api/session/me', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return response.json() as Promise<{ user?: { role: string } }>;
      })
      .then((data) => {
        if (data?.user?.role) {
          window.location.replace(
            data.user.role === 'citizen' ? nextPath : getHomeByRole(data.user.role),
          );
        }
      })
      .finally(() => setCheckingSession(false));
  }, [searchParams]);

  useEffect(() => {
    fetchWards()
      .then(setWards)
      .finally(() => setLoadingWards(false));
  }, []);

  function switchMode(nextMode: 'login' | 'signup') {
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', nextMode);
    router.replace(`/auth?${params.toString()}`, { scroll: false });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/session/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, phone: formatCitizenPhone(form.phone), portal: 'citizen' }),
      });

      const data = (await response.json()) as {
        error?: string;
        user?: { role: string };
      };

      if (!response.ok || !data.user) {
        throw new Error(data.error || `Unable to ${mode}.`);
      }

      const nextPath = getSafeNextPath(searchParams.get('next'), getHomeByRole(data.user.role));
      toast.success(mode === 'login' ? 'Signed in successfully.' : 'Citizen account created successfully.');
      window.location.assign(nextPath);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Unable to ${mode}.`);
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f7fbff_0%,#eef4ff_52%,#f6f8fc_100%)]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white px-6 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <Spinner label="Checking your account..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="flex h-[6px] w-full">
        <div className="flex-1 bg-[#ff9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      <div className="border-b border-[#dbe3f0] bg-[#1e3a8a] text-white shadow-[0_8px_24px_rgba(30,58,138,0.12)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-white" />
            <span className="font-semibold tracking-[0.08em] uppercase">Official Citizen Grievance Portal</span>
          </div>
          <div className="text-white/90">For complaint registration and tracking</div>
        </div>
      </div>

      <main className="overflow-hidden">
        <section className="relative isolate border-b border-slate-200 bg-[linear-gradient(180deg,#f7fbff_0%,#eef4ff_42%,#f9fafb_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,78,216,0.15),transparent_26%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.10),transparent_20%),radial-gradient(circle_at_bottom_right,rgba(22,163,74,0.08),transparent_22%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8 lg:py-10">
            <div className="max-w-none">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
                <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950">
                  <ArrowLeft className="h-4 w-4" />
                  Back to citizen home
                </Link>

                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm text-sky-800 shadow-sm">
                  <LockKeyhole className="h-4 w-4" />
                  Citizen account access
                </div>
              </div>

              <h1 className="mt-6 text-5xl font-semibold tracking-tight text-balance text-slate-950 sm:text-6xl lg:text-[4.35rem] lg:leading-[1.03]">
                Create Your Citizen Account
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Register once to raise complaints, track status, and receive updates from your department.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {featureBadges.map((badge, index) => (
                  <div
                    key={badge}
                    className={`rounded-full border px-4 py-2 text-sm font-medium ${
                      index === 0
                        ? 'border-[#ffd9ac] bg-[#fff7ed] text-[#9a5b00]'
                        : index === 1
                          ? 'border-[#d7e7ff] bg-white text-[#1450b8]'
                          : 'border-[#dff5e5] bg-white text-[#167c41]'
                    }`}
                  >
                    {badge}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild size="lg" className="rounded-full px-7">
                  <Link href="#citizen-auth-form" onClick={() => switchMode('signup')}>
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full px-7">
                  <Link href="/track">
                    Track Complaint
                    <SearchCheck className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {processSteps.map((step) => {
                  const Icon = step.icon;

                  return (
                    <div key={step.title} className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                      <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-sky-50 text-sky-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="mt-4 text-base font-semibold text-slate-950">{step.title}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                <div className="grid gap-4 lg:grid-cols-[1.06fr_0.94fr]">
                  <div>
                    <div className="text-sm font-semibold tracking-[0.18em] text-sky-800 uppercase">Why Register?</div>
                    <div className="mt-3 space-y-2">
                      {trustPoints.map((point) => (
                        <div key={point} className="flex items-start gap-3 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.45rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.18em] text-sky-800 uppercase">
                      <MapPinned className="h-4 w-4" />
                      Service Areas
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Wards are loaded directly from the portal so complaints are routed correctly.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {loadingWards ? (
                        <div className="text-sm text-slate-500">Loading service areas...</div>
                      ) : (
                        <>
                          {visibleWards.map((ward) => (
                            <span key={ward.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                              {ward.name}
                            </span>
                          ))}
                          {remainingWardCount > 0 ? (
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                              +{remainingWardCount} more
                            </span>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full" id="citizen-auth-form">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <div className="overflow-hidden rounded-[1.85rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
                  <div className="border-b border-slate-200 bg-[linear-gradient(90deg,#0b3b78_0%,#1d4ed8_62%,#f59e0b_100%)] px-5 py-3 text-white">
                    <div className="text-xs font-semibold tracking-[0.22em] text-white/80 uppercase">Citizen Service Access</div>
                    <div className="mt-1 text-[1.85rem] font-semibold leading-tight">
                      {mode === 'login' ? 'Sign in to continue' : 'Register and continue to your complaint'}
                    </div>
                    <p className="mt-1 text-sm text-white/85">
                      {mode === 'login'
                        ? 'Use your registered details to continue to complaint tracking or submission.'
                        : 'Create your account once and use the portal without confusion.'}
                    </p>
                  </div>

                  <Card className="gap-0 border-0 bg-transparent py-0 shadow-none">
                    <CardHeader className="gap-0 border-b border-slate-200 px-6 py-3 pb-3">
                      <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1">
                        <button
                          type="button"
                          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                            mode === 'signup' ? 'bg-slate-950 text-white' : 'text-slate-600'
                          }`}
                          onClick={() => switchMode('signup')}
                        >
                          Create Account
                        </button>
                        <button
                          type="button"
                          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                            mode === 'login' ? 'bg-slate-950 text-white' : 'text-slate-600'
                          }`}
                          onClick={() => switchMode('login')}
                        >
                          Sign In
                        </button>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        <CardTitle className="text-[1.95rem] leading-tight text-slate-950">
                          {mode === 'login' ? 'Citizen Sign In' : 'Citizen Registration'}
                        </CardTitle>
                        <CardDescription className="text-sm leading-6">
                          {mode === 'login'
                            ? 'Use this only if you have already created your citizen account earlier.'
                            : 'Create your account once and continue directly to complaint submission.'}
                        </CardDescription>
                      </div>
                    </CardHeader>

                    <CardContent className="px-5 pb-5 pt-3">
                      <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'signup' ? (
                          <div className="rounded-[1.3rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                            New citizen? Fill in your details below to create your account first.
                          </div>
                        ) : (
                          <div className="rounded-[1.3rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                            Already registered? Enter the same email and password you used during account creation.
                          </div>
                        )}

                        {mode === 'signup' ? (
                          <div className="space-y-4">
                            <div>
                              <div className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-950">Personal Details</div>
                              <div className="mt-4 space-y-2.5">
                                <Label htmlFor="name">Full name</Label>
                                <div className="relative">
                                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                  <Input
                                    id="name"
                                    value={form.name}
                                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                    className="h-11 rounded-xl border-slate-300 pl-10 focus-visible:border-sky-600 focus-visible:ring-sky-600"
                                    placeholder="Enter your full name"
                                    required
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-950">Contact Information</div>
                              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label htmlFor="phone">Phone number</Label>
                                  <div className="relative">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 rounded-md bg-slate-100 px-2 py-1 text-sm font-medium text-slate-700">
                                      +91
                                    </span>
                                    <Input
                                      id="phone"
                                      inputMode="numeric"
                                      pattern="[0-9]{10}"
                                      value={form.phone}
                                      onChange={(event) => setForm((current) => ({ ...current, phone: sanitizeIndianPhoneInput(event.target.value) }))}
                                      className="h-11 rounded-xl border-slate-300 pl-16 focus-visible:border-sky-600 focus-visible:ring-sky-600"
                                      placeholder="9876543210"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="email">Email address</Label>
                                  <div className="relative">
                                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                      id="email"
                                      type="email"
                                      value={form.email}
                                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                                      className="h-11 rounded-xl border-slate-300 pl-10 focus-visible:border-sky-600 focus-visible:ring-sky-600"
                                      placeholder="name@example.com"
                                      required
                                    />
                                  </div>
                                </div>
                              </div>
                              <p className="mt-2 text-xs text-slate-500">Optional mobile number can be used for profile communication.</p>
                            </div>

                            <div>
                              <div className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-950">Account Security</div>
                              <div className="mt-4 space-y-2.5">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                  <Input
                                    id="password"
                                    type="password"
                                    value={form.password}
                                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                                    className="h-11 rounded-xl border-slate-300 pl-10 focus-visible:border-sky-600 focus-visible:ring-sky-600"
                                    placeholder="Create a secure password"
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4.5">
                            <div>
                              <div className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-950">Contact Information</div>
                              <div className="mt-4 space-y-2.5">
                                <Label htmlFor="email">Email address</Label>
                                <div className="relative">
                                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                  <Input
                                    id="email"
                                    type="email"
                                    value={form.email}
                                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                                    className="h-11 rounded-xl border-slate-300 pl-10 focus-visible:border-sky-600 focus-visible:ring-sky-600"
                                    placeholder="name@example.com"
                                    required
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-950">Account Security</div>
                              <div className="mt-4 space-y-2.5">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                  <Input
                                    id="password"
                                    type="password"
                                    value={form.password}
                                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                                    className="h-11 rounded-xl border-slate-300 pl-10 focus-visible:border-sky-600 focus-visible:ring-sky-600"
                                    placeholder="Enter your password"
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                          {mode === 'signup'
                            ? 'After account creation, you can directly continue to complaint submission and select the relevant ward.'
                            : 'After sign in, you can continue to complaint registration or track an existing grievance.'}
                        </div>

                        <Button
                          type="submit"
                          className="h-12 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800"
                          disabled={loading}
                        >
                          {loading ? (
                            <Spinner label={mode === 'login' ? 'Signing in...' : 'Creating account...'} />
                          ) : mode === 'login' ? (
                            'Sign In to Citizen Portal'
                          ) : (
                            'Create Account and Continue'
                          )}
                        </Button>

                        <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-600">
                          {mode === 'signup' ? 'Already registered?' : 'New here?'}{' '}
                          <button
                            type="button"
                            onClick={() => switchMode(mode === 'signup' ? 'login' : 'signup')}
                            className="font-semibold text-sky-700 underline-offset-4 hover:underline"
                          >
                            {mode === 'signup' ? 'Sign in instead' : 'Create an account first'}
                          </button>
                          .
                        </div>

                        <div className="border-t border-slate-200 pt-4.5 text-center text-sm text-slate-500">
                          (c) Government Portal | Secure Citizen Access
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#eef4ff_52%,#f6f8fc_100%)]" />}>
      <CitizenAuthContent />
    </Suspense>
  );
}
