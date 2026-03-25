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
import { useLandingLanguage } from '@/components/landing-language';
import { SiteLanguageToggle } from '@/components/site-language-toggle';
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

const AUTH_TEXT = {
  en: {
    checkingSession: 'Checking your account...',
    topBannerTitle: 'Official Citizen Grievance Portal',
    topBannerText: 'For complaint registration and tracking',
    backHome: 'Back to citizen home',
    accessChip: 'Citizen account access',
    heroTitle: 'Create Your Citizen Account',
    heroDescription:
      'Register once to raise complaints, track status, and receive updates from your department.',
    featureBadges: ['Easy Complaint Registration', 'Track Complaint Status', 'Ward-Based Routing'],
    ctaCreate: 'Create Account',
    ctaTrack: 'Track Complaint',
    processSteps: [
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
    ],
    whyRegister: 'Why Register?',
    trustPoints: [
      'One account can be used for complaint registration and status tracking.',
      'Your selected ward and contact details remain available for future use.',
      'Citizen access is kept separate from internal departmental systems.',
    ],
    serviceAreas: 'Service Areas',
    serviceAreasDescription:
      'Wards are loaded directly from the portal so complaints are routed correctly.',
    loadingServiceAreas: 'Loading service areas...',
    moreSuffix: 'more',
    authPanelEyebrow: 'Citizen Service Access',
    panelTitle: {
      login: 'Sign in to continue',
      signup: 'Register and continue to your complaint',
    },
    panelDescription: {
      login: 'Use your registered details to continue to complaint tracking or submission.',
      signup: 'Create your account once and use the portal without confusion.',
    },
    tabs: {
      signup: 'Create Account',
      login: 'Sign In',
    },
    cardTitle: {
      login: 'Citizen Sign In',
      signup: 'Citizen Registration',
    },
    cardDescription: {
      login: 'Use this only if you have already created your citizen account earlier.',
      signup: 'Create your account once and continue directly to complaint submission.',
    },
    notices: {
      signup: 'New citizen? Fill in your details below to create your account first.',
      login:
        'Already registered? Enter the same email and password you used during account creation.',
    },
    sections: {
      personalDetails: 'Personal Details',
      contactInformation: 'Contact Information',
      accountSecurity: 'Account Security',
    },
    fields: {
      fullName: 'Full name',
      fullNamePlaceholder: 'Enter your full name',
      phoneNumber: 'Phone number',
      emailAddress: 'Email address',
      emailPlaceholder: 'name@example.com',
      password: 'Password',
      signupPasswordPlaceholder: 'Create a secure password',
      loginPasswordPlaceholder: 'Enter your password',
      phoneHelp: 'Optional mobile number can be used for profile communication.',
    },
    summary: {
      signup:
        'After account creation, you can directly continue to complaint submission and select the relevant ward.',
      login:
        'After sign in, you can continue to complaint registration or track an existing grievance.',
    },
    submit: {
      loadingLogin: 'Signing in...',
      loadingSignup: 'Creating account...',
      login: 'Sign In to Citizen Portal',
      signup: 'Create Account and Continue',
    },
    switchPrompt: {
      signup: 'Already registered?',
      login: 'New here?',
      signupAction: 'Sign in instead',
      loginAction: 'Create an account first',
    },
    footer: '(c) Government Portal | Secure Citizen Access',
    toast: {
      loginSuccess: 'Signed in successfully.',
      signupSuccess: 'Citizen account created successfully.',
      unableLogin: 'Unable to sign in.',
      unableSignup: 'Unable to create account.',
    },
  },
  hi: {
    checkingSession: 'आपका खाता जांचा जा रहा है...',
    topBannerTitle: 'आधिकारिक नागरिक शिकायत पोर्टल',
    topBannerText: 'शिकायत पंजीकरण और ट्रैकिंग के लिए',
    backHome: 'नागरिक होम पर वापस जाएं',
    accessChip: 'नागरिक खाता प्रवेश',
    heroTitle: 'अपना नागरिक खाता बनाएं',
    heroDescription:
      'एक बार पंजीकरण करें, शिकायत दर्ज करें, स्थिति ट्रैक करें और विभाग से अपडेट प्राप्त करें।',
    featureBadges: ['सरल शिकायत पंजीकरण', 'शिकायत स्थिति ट्रैकिंग', 'वार्ड आधारित रूटिंग'],
    ctaCreate: 'खाता बनाएं',
    ctaTrack: 'शिकायत ट्रैक करें',
    processSteps: [
      {
        title: 'अपना खाता बनाएं',
        description: 'नागरिक सेवाएं शुरू करने के लिए अपनी मूल जानकारी के साथ एक बार पंजीकरण करें।',
        icon: UserRound,
      },
      {
        title: 'शिकायत दर्ज करें',
        description: 'वार्ड और श्रेणी विवरण के साथ निर्देशित प्रक्रिया में शिकायत जमा करें।',
        icon: LockKeyhole,
      },
      {
        title: 'स्थिति देखें',
        description: 'अपने खाते के माध्यम से प्रगति, विभागीय कार्रवाई और अपडेट देखें।',
        icon: SearchCheck,
      },
    ],
    whyRegister: 'पंजीकरण क्यों करें?',
    trustPoints: [
      'एक ही खाते का उपयोग शिकायत पंजीकरण और स्थिति ट्रैकिंग दोनों के लिए किया जा सकता है।',
      'आपके चुने गए वार्ड और संपर्क विवरण भविष्य के उपयोग के लिए उपलब्ध रहेंगे।',
      'नागरिक प्रवेश को आंतरिक विभागीय प्रणालियों से अलग रखा जाता है।',
    ],
    serviceAreas: 'सेवा क्षेत्र',
    serviceAreasDescription:
      'वार्ड सीधे पोर्टल से लोड किए जाते हैं ताकि शिकायतें सही विभाग तक पहुंचें।',
    loadingServiceAreas: 'सेवा क्षेत्र लोड किए जा रहे हैं...',
    moreSuffix: 'और',
    authPanelEyebrow: 'नागरिक सेवा प्रवेश',
    panelTitle: {
      login: 'आगे बढ़ने के लिए साइन इन करें',
      signup: 'पंजीकरण करें और अपनी शिकायत जारी रखें',
    },
    panelDescription: {
      login: 'शिकायत ट्रैकिंग या पंजीकरण जारी रखने के लिए अपनी पंजीकृत जानकारी का उपयोग करें।',
      signup: 'एक बार खाता बनाएं और पोर्टल का सरल रूप से उपयोग करें।',
    },
    tabs: {
      signup: 'खाता बनाएं',
      login: 'साइन इन करें',
    },
    cardTitle: {
      login: 'नागरिक साइन इन',
      signup: 'नागरिक पंजीकरण',
    },
    cardDescription: {
      login: 'यदि आपने पहले ही अपना नागरिक खाता बनाया है, तो केवल उसी स्थिति में इसका उपयोग करें।',
      signup: 'एक बार अपना खाता बनाएं और सीधे शिकायत जमा करने की प्रक्रिया जारी रखें।',
    },
    notices: {
      signup: 'नए नागरिक हैं? पहले अपना खाता बनाने के लिए नीचे अपनी जानकारी भरें।',
      login: 'पहले से पंजीकृत हैं? वही ईमेल और पासवर्ड दर्ज करें जो खाते के समय उपयोग किया था।',
    },
    sections: {
      personalDetails: 'व्यक्तिगत विवरण',
      contactInformation: 'संपर्क जानकारी',
      accountSecurity: 'खाता सुरक्षा',
    },
    fields: {
      fullName: 'पूरा नाम',
      fullNamePlaceholder: 'अपना पूरा नाम दर्ज करें',
      phoneNumber: 'फोन नंबर',
      emailAddress: 'ईमेल पता',
      emailPlaceholder: 'name@example.com',
      password: 'पासवर्ड',
      signupPasswordPlaceholder: 'सुरक्षित पासवर्ड बनाएं',
      loginPasswordPlaceholder: 'अपना पासवर्ड दर्ज करें',
      phoneHelp: 'वैकल्पिक मोबाइल नंबर का उपयोग प्रोफाइल संबंधी संचार के लिए किया जा सकता है।',
    },
    summary: {
      signup: 'खाता बनने के बाद आप सीधे शिकायत जमा करने और संबंधित वार्ड चुनने की प्रक्रिया जारी रख सकते हैं।',
      login: 'साइन इन करने के बाद आप शिकायत पंजीकरण जारी रख सकते हैं या मौजूदा शिकायत ट्रैक कर सकते हैं।',
    },
    submit: {
      loadingLogin: 'साइन इन किया जा रहा है...',
      loadingSignup: 'खाता बनाया जा रहा है...',
      login: 'नागरिक पोर्टल में साइन इन करें',
      signup: 'खाता बनाएं और आगे बढ़ें',
    },
    switchPrompt: {
      signup: 'पहले से पंजीकृत हैं?',
      login: 'नए उपयोगकर्ता हैं?',
      signupAction: 'इसके बजाय साइन इन करें',
      loginAction: 'पहले खाता बनाएं',
    },
    footer: '(c) सरकारी पोर्टल | सुरक्षित नागरिक प्रवेश',
    toast: {
      loginSuccess: 'सफलतापूर्वक साइन इन हुआ।',
      signupSuccess: 'नागरिक खाता सफलतापूर्वक बन गया।',
      unableLogin: 'साइन इन नहीं हो सका।',
      unableSignup: 'खाता नहीं बनाया जा सका।',
    },
  },
} as const;

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
  const { language } = useLandingLanguage();
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
  const text = AUTH_TEXT[language];

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

        return response.json() as Promise<{ user?: { role: string; redirect_to?: string } }>;
      })
      .then((data) => {
        if (data?.user?.role) {
          window.location.replace(
            data.user.role === 'citizen'
              ? nextPath
              : data.user.redirect_to || getHomeByRole(data.user.role),
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
        redirect_to?: string;
        user?: { role: string; redirect_to?: string };
      };

      if (!response.ok || !data.user) {
        throw new Error(
          data.error || (mode === 'login' ? text.toast.unableLogin : text.toast.unableSignup),
        );
      }

      const nextPath = getSafeNextPath(
        searchParams.get('next'),
        data.redirect_to || data.user.redirect_to || getHomeByRole(data.user.role),
      );
      toast.success(mode === 'login' ? text.toast.loginSuccess : text.toast.signupSuccess);
      window.location.assign(nextPath);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : mode === 'login'
            ? text.toast.unableLogin
            : text.toast.unableSignup,
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f7fbff_0%,#eef4ff_52%,#f6f8fc_100%)]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white px-6 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <Spinner label={text.checkingSession} />
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
            <span className="font-semibold tracking-[0.08em] uppercase">{text.topBannerTitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-white/90 sm:block">{text.topBannerText}</div>
            <SiteLanguageToggle />
          </div>
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
                  {text.backHome}
                </Link>

                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm text-sky-800 shadow-sm">
                  <LockKeyhole className="h-4 w-4" />
                  {text.accessChip}
                </div>
              </div>

              <h1 className="mt-6 text-5xl font-semibold tracking-tight text-balance text-slate-950 sm:text-6xl lg:text-[4.35rem] lg:leading-[1.03]">
                {text.heroTitle}
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                {text.heroDescription}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {text.featureBadges.map((badge, index) => (
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
                    {text.ctaCreate}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full px-7">
                  <Link href="/track">
                    {text.ctaTrack}
                    <SearchCheck className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {text.processSteps.map((step) => {
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
                    <div className="text-sm font-semibold tracking-[0.18em] text-sky-800 uppercase">{text.whyRegister}</div>
                    <div className="mt-3 space-y-2">
                      {text.trustPoints.map((point) => (
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
                      {text.serviceAreas}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {text.serviceAreasDescription}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {loadingWards ? (
                        <div className="text-sm text-slate-500">{text.loadingServiceAreas}</div>
                      ) : (
                        <>
                          {visibleWards.map((ward) => (
                            <span key={ward.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                              {ward.name}
                            </span>
                          ))}
                          {remainingWardCount > 0 ? (
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                              +{remainingWardCount} {text.moreSuffix}
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
                    <div className="text-xs font-semibold tracking-[0.22em] text-white/80 uppercase">{text.authPanelEyebrow}</div>
                    <div className="mt-1 text-[1.85rem] font-semibold leading-tight">
                      {mode === 'login' ? text.panelTitle.login : text.panelTitle.signup}
                    </div>
                    <p className="mt-1 text-sm text-white/85">
                      {mode === 'login' ? text.panelDescription.login : text.panelDescription.signup}
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
                          {text.tabs.signup}
                        </button>
                        <button
                          type="button"
                          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                            mode === 'login' ? 'bg-slate-950 text-white' : 'text-slate-600'
                          }`}
                          onClick={() => switchMode('login')}
                        >
                          {text.tabs.login}
                        </button>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        <CardTitle className="text-[1.95rem] leading-tight text-slate-950">
                          {mode === 'login' ? text.cardTitle.login : text.cardTitle.signup}
                        </CardTitle>
                        <CardDescription className="text-sm leading-6">
                          {mode === 'login' ? text.cardDescription.login : text.cardDescription.signup}
                        </CardDescription>
                      </div>
                    </CardHeader>

                    <CardContent className="px-5 pb-5 pt-3">
                      <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'signup' ? (
                          <div className="rounded-[1.3rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                            {text.notices.signup}
                          </div>
                        ) : (
                          <div className="rounded-[1.3rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                            {text.notices.login}
                          </div>
                        )}

                        {mode === 'signup' ? (
                          <div className="space-y-4">
                            <div>
                              <div className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-950">{text.sections.personalDetails}</div>
                              <div className="mt-4 space-y-2.5">
                                <Label htmlFor="name">{text.fields.fullName}</Label>
                                <div className="relative">
                                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                  <Input
                                    id="name"
                                    value={form.name}
                                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                    className="h-11 rounded-xl border-slate-300 pl-10 focus-visible:border-sky-600 focus-visible:ring-sky-600"
                                    placeholder={text.fields.fullNamePlaceholder}
                                    required
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-950">{text.sections.contactInformation}</div>
                              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label htmlFor="phone">{text.fields.phoneNumber}</Label>
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
                                  <Label htmlFor="email">{text.fields.emailAddress}</Label>
                                  <div className="relative">
                                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                      id="email"
                                      type="email"
                                      value={form.email}
                                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                                      className="h-11 rounded-xl border-slate-300 pl-10 focus-visible:border-sky-600 focus-visible:ring-sky-600"
                                      placeholder={text.fields.emailPlaceholder}
                                      required
                                    />
                                  </div>
                                </div>
                              </div>
                              <p className="mt-2 text-xs text-slate-500">{text.fields.phoneHelp}</p>
                            </div>

                            <div>
                              <div className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-950">{text.sections.accountSecurity}</div>
                              <div className="mt-4 space-y-2.5">
                                <Label htmlFor="password">{text.fields.password}</Label>
                                <div className="relative">
                                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                  <Input
                                    id="password"
                                    type="password"
                                    value={form.password}
                                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                                    className="h-11 rounded-xl border-slate-300 pl-10 focus-visible:border-sky-600 focus-visible:ring-sky-600"
                                    placeholder={text.fields.signupPasswordPlaceholder}
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4.5">
                            <div>
                              <div className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-950">{text.sections.contactInformation}</div>
                              <div className="mt-4 space-y-2.5">
                                <Label htmlFor="email">{text.fields.emailAddress}</Label>
                                <div className="relative">
                                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                  <Input
                                    id="email"
                                    type="email"
                                    value={form.email}
                                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                                    className="h-11 rounded-xl border-slate-300 pl-10 focus-visible:border-sky-600 focus-visible:ring-sky-600"
                                    placeholder={text.fields.emailPlaceholder}
                                    required
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-950">{text.sections.accountSecurity}</div>
                              <div className="mt-4 space-y-2.5">
                                <Label htmlFor="password">{text.fields.password}</Label>
                                <div className="relative">
                                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                  <Input
                                    id="password"
                                    type="password"
                                    value={form.password}
                                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                                    className="h-11 rounded-xl border-slate-300 pl-10 focus-visible:border-sky-600 focus-visible:ring-sky-600"
                                    placeholder={text.fields.loginPasswordPlaceholder}
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                          {mode === 'signup' ? text.summary.signup : text.summary.login}
                        </div>

                        <Button
                          type="submit"
                          className="h-12 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800"
                          disabled={loading}
                        >
                          {loading ? (
                            <Spinner label={mode === 'login' ? text.submit.loadingLogin : text.submit.loadingSignup} />
                          ) : mode === 'login' ? (
                            text.submit.login
                          ) : (
                            text.submit.signup
                          )}
                        </Button>

                        <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-600">
                          {mode === 'signup' ? text.switchPrompt.signup : text.switchPrompt.login}{' '}
                          <button
                            type="button"
                            onClick={() => switchMode(mode === 'signup' ? 'login' : 'signup')}
                            className="font-semibold text-sky-700 underline-offset-4 hover:underline"
                          >
                            {mode === 'signup' ? text.switchPrompt.signupAction : text.switchPrompt.loginAction}
                          </button>
                          .
                        </div>

                        <div className="border-t border-slate-200 pt-4.5 text-center text-sm text-slate-500">
                          {text.footer}
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
