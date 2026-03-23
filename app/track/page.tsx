'use client';

import type { FormEvent } from 'react';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, SearchCheck, ShieldCheck } from 'lucide-react';

import { formatTrackerDateTime } from '@/lib/complaint-tracker';
import { fetchPublicComplaintByTrackingCode } from '@/lib/client/complaints';
import type { PublicComplaintLookupResult } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function PublicTrackPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get('code')?.trim() || '';
  const [lookupCode, setLookupCode] = useState(codeFromUrl);
  const [result, setResult] = useState<PublicComplaintLookupResult | null>(null);
  const [loading, setLoading] = useState(Boolean(codeFromUrl));
  const [error, setError] = useState('');

  useEffect(() => {
    setLookupCode(codeFromUrl);

    if (!codeFromUrl) {
      setResult(null);
      setError('');
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError('');

    fetchPublicComplaintByTrackingCode(codeFromUrl)
      .then((data) => {
        if (cancelled) {
          return;
        }

        if (data.access === 'owner' && data.redirect_to) {
          router.replace(data.redirect_to);
          return;
        }

        setResult(data);
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        setResult(null);
        setError(requestError instanceof Error ? requestError.message : 'Unable to load complaint tracking right now.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [codeFromUrl, router]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedCode = lookupCode.trim();

    if (!trimmedCode) {
      setResult(null);
      setError('Enter a tracking ID to continue.');
      return;
    }

    router.replace(`/track?code=${encodeURIComponent(trimmedCode)}`);
  }

  const nextTrackPath = codeFromUrl ? `/track?code=${encodeURIComponent(codeFromUrl)}` : '/track';
  const loginHref = `/auth?mode=login&next=${encodeURIComponent(nextTrackPath)}`;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef4f8_100%)] text-slate-950">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-sm font-medium text-[#0b3c5d] hover:underline">
              Back to Home
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Public Complaint Tracking
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              Check complaint status quickly without signing in. Only limited tracking information is shown here.
            </p>
          </div>
          <div className="hidden rounded-2xl border border-[#d7e2eb] bg-white px-5 py-4 text-sm text-slate-600 shadow-sm sm:block">
            <div className="font-semibold text-slate-950">Visible here</div>
            <div className="mt-1">ID, status, stage, department, and last update only.</div>
          </div>
        </div>

        <Card className="border border-slate-300 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0b3c5d]">
              <SearchCheck className="h-4 w-4" />
              Track by complaint tracking ID
            </div>
            <CardTitle>Find your complaint status</CardTitle>
            <CardDescription>
              Open this page directly with <span className="font-mono">/track?code=&lt;tracking_code&gt;</span> or enter the tracking ID below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={lookupCode}
                onChange={(event) => setLookupCode(event.target.value)}
                placeholder="Enter tracking ID"
                className="h-11 border-slate-300"
              />
              <Button type="submit" className="h-11 bg-[#0b3c5d] px-6 text-white hover:bg-[#082d46]">
                Track Complaint
              </Button>
            </form>

            {loading ? (
              <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                Checking complaint status...
              </div>
            ) : null}

            {error ? (
              <div className="border border-rose-300 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {!loading && !result && !error ? (
              <div className="border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                Enter a valid tracking ID to view the current complaint summary.
              </div>
            ) : null}
          </CardContent>
        </Card>

        {result ? (
          <div className="mt-8 space-y-6">
            <Card className="border border-slate-300 bg-white shadow-none">
              <CardHeader className="space-y-3 border-b border-slate-200">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  Public-safe complaint summary
                </div>
                <CardTitle className="text-2xl">Complaint {result.complaint.complaint_id}</CardTitle>
                <CardDescription>
                  Sensitive details such as complaint text, attachments, proof images, user data, worker details, and internal notes are hidden.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-6 py-6">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <SummaryField label="Complaint ID" value={result.complaint.complaint_id} />
                  <SummaryField label="Current Status" value={result.complaint.status} />
                  <SummaryField label="Current Stage" value={result.complaint.current_stage} />
                  <SummaryField label="Department" value={result.complaint.department} />
                  <SummaryField label="Last Updated" value={formatTrackerDateTime(result.complaint.last_updated)} />
                </div>

                <div className="rounded-2xl border border-[#d9e2ea] bg-[#f8fbff] px-5 py-4">
                  <div className="text-sm font-semibold text-slate-950">Need full complaint details?</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Sign in as the complaint owner to open the full tracker with complete timeline, evidence, and feedback controls.
                  </p>
                  <div className="mt-4">
                    <Button asChild className="bg-[#0b3c5d] text-white hover:bg-[#082d46]">
                      <Link href={loginHref}>
                        Login to view full details
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default function PublicTrackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef4f8_100%)] text-slate-950">
          <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-10 sm:px-6 lg:px-8">
            <Card className="border border-slate-300 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
              <CardContent className="px-6 py-8 text-sm text-slate-600">Loading complaint tracker...</CardContent>
            </Card>
          </main>
        </div>
      }
    >
      <PublicTrackPageContent />
    </Suspense>
  );
}
