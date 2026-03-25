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
import { useLandingLanguage } from '@/components/landing-language';
import { SiteLanguageToggle } from '@/components/site-language-toggle';

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

const TEXT = {
  en: {
    loadError: 'Unable to load complaint tracking right now.',
    emptyTrackingId: 'Enter a tracking ID to continue.',
    backToHome: 'Back to Home',
    title: 'Public Complaint Tracking',
    subtitle: 'Check complaint status quickly without signing in. Only limited tracking information is shown here.',
    visibleHere: 'Visible here',
    visibleHereDescription: 'ID, status, stage, department, and last update only.',
    trackById: 'Track by complaint tracking ID',
    findStatus: 'Find your complaint status',
    findStatusDescription:
      'Open this page directly with /track?code=<tracking_code> or enter the tracking ID below.',
    trackingIdPlaceholder: 'Enter tracking ID',
    trackComplaint: 'Track Complaint',
    checking: 'Checking complaint status...',
    emptyState: 'Enter a valid tracking ID to view the current complaint summary.',
    publicSafeSummary: 'Public-safe complaint summary',
    complaintTitle: 'Complaint',
    summaryDescription:
      'Sensitive details such as complaint text, attachments, proof images, user data, worker details, and internal notes are hidden.',
    complaintId: 'Complaint ID',
    currentStatus: 'Current Status',
    currentStage: 'Current Stage',
    department: 'Department',
    lastUpdated: 'Last Updated',
    needFullDetails: 'Need full complaint details?',
    needFullDetailsDescription:
      'Sign in as the complaint owner to open the full tracker with complete timeline, evidence, and feedback controls.',
    loginToView: 'Login to view full details',
    loadingTracker: 'Loading complaint tracker...',
  },
  hi: {
    loadError: 'अभी शिकायत ट्रैकिंग लोड नहीं हो सकी।',
    emptyTrackingId: 'जारी रखने के लिए ट्रैकिंग आईडी दर्ज करें।',
    backToHome: 'होम पर वापस जाएं',
    title: 'सार्वजनिक शिकायत ट्रैकिंग',
    subtitle: 'बिना साइन इन किए शिकायत की स्थिति जल्दी देखें। यहां केवल सीमित ट्रैकिंग जानकारी दिखाई जाती है।',
    visibleHere: 'यहां दिखाई देगा',
    visibleHereDescription: 'केवल आईडी, स्थिति, चरण, विभाग और अंतिम अपडेट।',
    trackById: 'शिकायत ट्रैकिंग आईडी से ट्रैक करें',
    findStatus: 'अपनी शिकायत की स्थिति देखें',
    findStatusDescription:
      'इस पेज को सीधे /track?code=<tracking_code> से खोलें या नीचे ट्रैकिंग आईडी दर्ज करें।',
    trackingIdPlaceholder: 'ट्रैकिंग आईडी दर्ज करें',
    trackComplaint: 'शिकायत ट्रैक करें',
    checking: 'शिकायत की स्थिति जांची जा रही है...',
    emptyState: 'वर्तमान शिकायत सारांश देखने के लिए मान्य ट्रैकिंग आईडी दर्ज करें।',
    publicSafeSummary: 'सार्वजनिक सुरक्षित शिकायत सारांश',
    complaintTitle: 'शिकायत',
    summaryDescription:
      'शिकायत का पाठ, संलग्नक, प्रमाण चित्र, उपयोगकर्ता डेटा, कर्मचारी विवरण और आंतरिक टिप्पणियां जैसी संवेदनशील जानकारी छिपाई जाती है।',
    complaintId: 'शिकायत आईडी',
    currentStatus: 'वर्तमान स्थिति',
    currentStage: 'वर्तमान चरण',
    department: 'विभाग',
    lastUpdated: 'अंतिम अपडेट',
    needFullDetails: 'पूरी शिकायत जानकारी चाहिए?',
    needFullDetailsDescription:
      'पूरी टाइमलाइन, प्रमाण और फीडबैक नियंत्रण देखने के लिए शिकायत स्वामी के रूप में साइन इन करें।',
    loginToView: 'पूरी जानकारी देखने के लिए लॉगिन करें',
    loadingTracker: 'शिकायत ट्रैकर लोड हो रहा है...',
  },
} as const;

function PublicTrackPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLandingLanguage();
  const codeFromUrl = searchParams.get('code')?.trim() || '';
  const [lookupCode, setLookupCode] = useState(codeFromUrl);
  const [result, setResult] = useState<PublicComplaintLookupResult | null>(null);
  const [loading, setLoading] = useState(Boolean(codeFromUrl));
  const [error, setError] = useState('');
  const text = TEXT[language];

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
        setError(requestError instanceof Error ? requestError.message : text.loadError);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [codeFromUrl, router, text.loadError]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedCode = lookupCode.trim();

    if (!trimmedCode) {
      setResult(null);
      setError(text.emptyTrackingId);
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
              {text.backToHome}
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {text.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              {text.subtitle}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <SiteLanguageToggle className="border-slate-300 bg-white text-slate-700" />
            <div className="hidden rounded-2xl border border-[#d7e2eb] bg-white px-5 py-4 text-sm text-slate-600 shadow-sm sm:block">
              <div className="font-semibold text-slate-950">{text.visibleHere}</div>
              <div className="mt-1">{text.visibleHereDescription}</div>
            </div>
          </div>
        </div>

        <Card className="border border-slate-300 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0b3c5d]">
              <SearchCheck className="h-4 w-4" />
              {text.trackById}
            </div>
            <CardTitle>{text.findStatus}</CardTitle>
            <CardDescription>
              {text.findStatusDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={lookupCode}
                onChange={(event) => setLookupCode(event.target.value)}
                placeholder={text.trackingIdPlaceholder}
                className="h-11 border-slate-300"
              />
              <Button type="submit" className="h-11 bg-[#0b3c5d] px-6 text-white hover:bg-[#082d46]">
                {text.trackComplaint}
              </Button>
            </form>

            {loading ? (
              <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                {text.checking}
              </div>
            ) : null}

            {error ? (
              <div className="border border-rose-300 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {!loading && !result && !error ? (
              <div className="border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                {text.emptyState}
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
                  {text.publicSafeSummary}
                </div>
                <CardTitle className="text-2xl">{text.complaintTitle} {result.complaint.complaint_id}</CardTitle>
                <CardDescription>
                  {text.summaryDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-6 py-6">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <SummaryField label={text.complaintId} value={result.complaint.complaint_id} />
                  <SummaryField label={text.currentStatus} value={result.complaint.status} />
                  <SummaryField label={text.currentStage} value={result.complaint.current_stage} />
                  <SummaryField label={text.department} value={result.complaint.department} />
                  <SummaryField label={text.lastUpdated} value={formatTrackerDateTime(result.complaint.last_updated)} />
                </div>

                <div className="rounded-2xl border border-[#d9e2ea] bg-[#f8fbff] px-5 py-4">
                  <div className="text-sm font-semibold text-slate-950">{text.needFullDetails}</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {text.needFullDetailsDescription}
                  </p>
                  <div className="mt-4">
                    <Button asChild className="bg-[#0b3c5d] text-white hover:bg-[#082d46]">
                      <Link href={loginHref}>
                        {text.loginToView}
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
