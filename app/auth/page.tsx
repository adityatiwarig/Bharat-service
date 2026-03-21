'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Landmark, LockKeyhole, LogIn, ShieldCheck, ShieldEllipsis, UserRound } from 'lucide-react';
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

const citizenBenefits = [
  'New citizens can create an account first and start using the portal immediately.',
  'Your ward list is already available in the portal, so complaint filing stays simple.',
  'You can raise a complaint, track status, and return later with the same account.',
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

  useEffect(() => {
    const requestedMode = searchParams.get('mode');
    setMode(requestedMode === 'login' ? 'login' : 'signup');
  }, [searchParams]);

  useEffect(() => {
    const nextPath = getSafeNextPath(searchParams.get('next'), '/citizen');

    fetch('/api/auth/me', { cache: 'no-store' })
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

  const heading = useMemo(
    () =>
      mode === 'login'
        ? 'Sign in to continue to your citizen account'
        : 'Create your citizen account first',
    [mode],
  );

  function switchMode(nextMode: 'login' | 'signup') {
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', nextMode);
    router.replace(`/auth?${params.toString()}`, { scroll: false });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
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
        <div className="gov-surface rounded-[1.6rem] border border-slate-200/80 px-6 py-5">
          <Spinner label="Checking your account..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#eef4ff_52%,#f6f8fc_100%)]">
      <div className="border-b border-sky-900/20 bg-[linear-gradient(90deg,#ff9933_0%,#fff4e6_18%,#0f172a_18%,#0f172a_82%,#138808_100%)] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Landmark className="h-3.5 w-3.5 text-amber-300" />
            <span>Official Citizen Grievance Portal</span>
          </div>
          <div className="text-slate-300">Citizen account access for complaint registration and status tracking</div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-16">
        <div className="max-w-xl">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" />
            Back to citizen home
          </Link>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm text-sky-800 shadow-sm">
            <LockKeyhole className="h-4 w-4" />
            Citizen account access
          </div>

          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-slate-950">{heading}</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            This page is only for citizens. New users should create an account first, and existing users can sign in
            with the same details later to raise complaints and track updates.
          </p>

          <div className="mt-8 space-y-4">
            {citizenBenefits.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-700 shadow-sm">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[1.8rem] border border-sky-100 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.2em] text-sky-700 uppercase">
              <ShieldEllipsis className="h-4 w-4" />
              Before You Continue
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-950">New User</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Choose <span className="font-semibold text-slate-900">Create Account</span> first to register your details.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-950">Existing User</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use <span className="font-semibold text-slate-900">Sign In</span> only if you have already created your account earlier.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.2em] text-sky-700 uppercase">
              <ShieldCheck className="h-4 w-4" />
              Service Areas
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Complaint areas are loaded from the portal database so citizens can choose the correct ward without confusion.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {loadingWards
                ? <div className="text-sm text-slate-500">Loading service areas...</div>
                : wards.map((ward) => (
                    <span key={ward.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {ward.name}
                    </span>
                  ))}
            </div>
          </div>
        </div>

        <Card className="mx-auto w-full max-w-xl rounded-[2rem] border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <CardHeader>
            <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${mode === 'signup' ? 'bg-slate-950 text-white' : 'text-slate-600'}`}
                onClick={() => switchMode('signup')}
              >
                Create Account
              </button>
              <button
                type="button"
                className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${mode === 'login' ? 'bg-slate-950 text-white' : 'text-slate-600'}`}
                onClick={() => switchMode('login')}
              >
                Sign In
              </button>
            </div>
            <CardDescription>
              {mode === 'login'
                ? 'Use this only if you have already created your citizen account earlier.'
                : 'New users should start here. Create your account once and continue to the citizen portal.'}
            </CardDescription>
            <CardTitle className="text-3xl text-slate-950">
              {mode === 'login' ? 'Citizen Sign In' : 'Citizen Sign Up'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'signup' ? (
                <div className="rounded-[1.3rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                  New citizen? Fill in your details below to create your account first.
                </div>
              ) : (
                <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Already registered? Enter the same email and password you used during account creation.
                </div>
              )}

              {mode === 'signup' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        className="h-11 pl-10"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                  </div>
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
                        className="h-11 pl-16"
                        placeholder="9876543210"
                      />
                    </div>
                    <p className="text-xs text-slate-500">Optional mobile number for your citizen profile.</p>
                  </div>
                </>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="h-11 pl-10"
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    className="h-11 pl-10"
                    placeholder={mode === 'login' ? 'Enter your password' : 'Create a secure password'}
                    required
                  />
                </div>
              </div>

              <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                {mode === 'signup'
                  ? 'After account creation, you can directly raise a complaint by selecting your ward from the portal list.'
                  : 'After sign in, you can continue to your dashboard, raise a complaint, or track an existing one.'}
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800"
                disabled={loading}
              >
                {loading ? <Spinner label={mode === 'login' ? 'Signing in...' : 'Creating account...'} /> : mode === 'login' ? 'Sign In to Citizen Portal' : 'Create Account and Continue'}
              </Button>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  <div className="font-semibold text-slate-950">Trusted Citizen Access</div>
                  <p className="mt-1 leading-6">Your account is used only to submit complaints, track status, and access citizen services.</p>
                </div>
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  <div className="font-semibold text-slate-950">Simple and Secure</div>
                  <p className="mt-1 leading-6">Citizen access stays separate from department accounts so the process remains clear and safe.</p>
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
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

              <div className="text-center text-sm text-slate-600">
                Internal panels are available only on{' '}
                <Link href="/worker-login" className="inline-flex items-center gap-1 font-semibold text-sky-700 underline-offset-4 hover:underline">
                  <LogIn className="h-3.5 w-3.5" />
                  Department Login
                </Link>
                .
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
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
