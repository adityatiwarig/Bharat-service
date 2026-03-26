'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Landmark,
  LockKeyhole,
  SearchCheck,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
  const isHindi = language === 'hi';
  const uiCopy = {
    topHeaderTitle: isHindi
      ? 'आधिकारिक नागरिक शिकायत पोर्टल'
      : 'Official Municipal Citizen Grievance Portal',
    topHeaderHelpdesk: isHindi
      ? 'नागरिक हेल्पडेस्क: 1800-100-2024'
      : 'Citizen Helpdesk: 1800-100-2024',
    toggleLogin: isHindi ? 'साइन इन' : 'Sign In',
    toggleSignup: isHindi ? 'रजिस्टर' : 'Register',
    label: mode === 'login'
      ? isHindi
        ? 'नागरिक सेवा प्रवेश'
        : 'CITIZEN SERVICE ACCESS'
      : isHindi
        ? 'नागरिक पंजीकरण'
        : 'CITIZEN REGISTRATION',
    heading: mode === 'login'
      ? isHindi
        ? 'नागरिक साइन इन'
        : 'Citizen Sign In'
      : isHindi
        ? 'नागरिक खाता बनाएं'
        : 'Create Citizen Account',
    subtext: mode === 'login'
      ? isHindi
        ? 'अपने शिकायत डैशबोर्ड तक पहुंचने और अनुरोधों को ट्रैक करने के लिए साइन इन करें।'
        : 'Sign in to access your complaint dashboard and track requests.'
      : isHindi
        ? 'शिकायतें दर्ज करने और उनकी प्रगति ट्रैक करने के लिए एक बार पंजीकरण करें।'
        : 'Register once to submit complaints and track their progress.',
    infoBox: mode === 'login'
      ? isHindi
        ? 'अपने खाते तक सुरक्षित पहुंच के लिए अपने पंजीकृत क्रेडेंशियल दर्ज करें।'
        : 'Enter your registered credentials to securely access your account.'
      : isHindi
        ? 'अपना नागरिक खाता बनाने के लिए अपनी मूल जानकारी प्रदान करें।'
        : 'Provide your basic details to create your citizen account.',
    leftTitle: isHindi ? 'सार्वजनिक शिकायत पोर्टल' : 'Public Grievance Portal',
    leftSubtitle: mode === 'login'
      ? isHindi
        ? 'शिकायतों को प्रबंधित करने के लिए अपने खाते तक पहुंचें'
        : 'Access your account to manage complaints'
      : isHindi
        ? 'शिकायत दर्ज करने और उसे आसानी से ट्रैक करने के लिए पंजीकरण करें'
        : 'Register to submit and track complaints easily',
    emailLabel: isHindi ? 'ईमेल पता' : 'Email Address',
    passwordLabel: isHindi ? 'पासवर्ड' : 'Password',
    fullNameLabel: isHindi ? 'पूरा नाम' : 'Full Name',
    mobileLabel: isHindi ? 'मोबाइल नंबर' : 'Mobile Number',
    loginButton: isHindi ? 'जारी रखने के लिए साइन इन करें' : 'Sign In to Continue',
    signupButton: isHindi ? 'पंजीकरण करें और जारी रखें' : 'Register and Continue',
    officialNote: isHindi
      ? 'यह एक आधिकारिक सरकारी पोर्टल है। आपकी जानकारी सुरक्षित है।'
      : 'This is an official government portal. Your information is secure.',
    bottomPrefix: mode === 'login'
      ? isHindi
        ? 'नए उपयोगकर्ता?'
        : 'New user?'
      : isHindi
        ? 'पहले से पंजीकृत हैं?'
        : 'Already registered?',
    bottomAction: mode === 'login'
      ? isHindi
        ? 'नागरिक खाता बनाएं'
        : 'Create a citizen account'
      : isHindi
        ? 'अपने खाते में साइन इन करें'
        : 'Sign in to your account',
    bottomSuffix: mode === 'login'
      ? isHindi
        ? 'ताकि शिकायतें दर्ज कर सकें और स्थिति ट्रैक कर सकें।'
        : 'to raise complaints and track status.'
      : '',
  };

  useEffect(() => {
    const requestedMode = searchParams?.get('mode');
    setMode(requestedMode === 'login' ? 'login' : 'signup');
  }, [searchParams]);

  useEffect(() => {
    const nextPath = getSafeNextPath(searchParams?.get('next') ?? null, '/citizen');

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
    const params = new URLSearchParams(searchParams?.toString() || '');
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
        searchParams?.get('next') ?? null,
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
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-950">
      <div className="border-b border-[#dbe3f0] bg-[#1e3a8a] text-white shadow-[0_8px_24px_rgba(30,58,138,0.12)]">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-1.5 text-sm sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-white" />
            <span className="font-semibold tracking-[0.08em] uppercase">{uiCopy.topHeaderTitle}</span>
          </div>
          <div className="text-white/90">{uiCopy.topHeaderHelpdesk}</div>
        </div>
      </div>

      <main className="main-container citizen-auth-container">
        <section
          className="left citizen-auth-left relative flex h-[40vh] min-h-[320px] items-end overflow-hidden bg-cover bg-center bg-no-repeat px-6 py-8 sm:px-8 sm:py-10 md:h-full md:min-h-0 md:items-end md:px-10 md:pb-32 md:pt-8 lg:px-12"
          style={{ backgroundImage: "url('/images/citizen-bg.webp')" }}
        >
          <div className="absolute inset-0 bg-[rgba(15,40,80,0.75)]" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:18px_18px] opacity-60" />

          <div className="left-content max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold tracking-[0.18em] uppercase text-white/90">
              <Landmark className="h-4 w-4" />
              {uiCopy.label}
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {uiCopy.leftTitle}
            </h1>
            <div className="mt-4 flex items-center gap-3">
              <span className="h-1 w-24 rounded-full bg-[#ff9933]" />
              <span className="h-1 w-28 rounded-full bg-white/90" />
              <span className="h-1 w-24 rounded-full bg-[#138808]" />
            </div>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/90 sm:text-lg">
              {uiCopy.leftSubtitle}
            </p>
          </div>
        </section>

        <section className="right citizen-auth-right relative flex min-h-[60vh] items-center justify-center bg-[#f8fafc] px-5 py-8 sm:px-6 md:h-full md:min-h-0 md:px-8 md:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.05)_1px,transparent_1px)] [background-size:18px_18px] opacity-40" />

          <div className="login-card login-wrapper relative z-10 w-full p-5 sm:p-6 md:p-8">
            <div className="mx-auto w-full max-w-[500px]">
              <div className="flex items-start justify-between gap-4">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#1e40af]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {text.backHome}
                </Link>
                <div className="shrink-0">
                  <SiteLanguageToggle />
                </div>
              </div>

              <div className="mt-6 flex rounded-full border border-slate-200 bg-slate-100 p-1">
                <button
                  type="button"
                  className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                    mode === 'login' ? 'bg-[#133f7b] text-white' : 'text-slate-600'
                  }`}
                  onClick={() => switchMode('login')}
                >
                  {uiCopy.toggleLogin}
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                    mode === 'signup' ? 'bg-[#133f7b] text-white' : 'text-slate-600'
                  }`}
                  onClick={() => switchMode('signup')}
                >
                  {uiCopy.toggleSignup}
                </button>
              </div>

              <div className="mt-6">
                <div className="text-xs font-semibold tracking-[0.22em] text-[#1e40af]/75 uppercase">
                  {uiCopy.label}
                </div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 md:text-[2.25rem]">
                  {uiCopy.heading}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{uiCopy.subtext}</p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div className="rounded-[10px] border border-[#dbeafe] bg-[#f8fbff] px-4 py-4 text-sm leading-7 text-slate-600">
                  {uiCopy.infoBox}
                </div>

                {mode === 'signup' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-slate-900">
                        {uiCopy.fullNameLabel}
                      </Label>
                      <div className="relative">
                        <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="name"
                          value={form.name}
                          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                          className="h-12 rounded-[10px] border-[#e2e8f0] bg-white pl-11 text-slate-950 placeholder:text-slate-400 transition duration-200 focus-visible:border-[#1e40af] focus-visible:ring-2 focus-visible:ring-[#1e40af]/15"
                          placeholder={text.fields.fullNamePlaceholder}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium text-slate-900">
                          {uiCopy.mobileLabel}
                        </Label>
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
                            className="h-12 rounded-[10px] border-[#e2e8f0] bg-white pl-16 text-slate-950 placeholder:text-slate-400 transition duration-200 focus-visible:border-[#1e40af] focus-visible:ring-2 focus-visible:ring-[#1e40af]/15"
                            placeholder="9876543210"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-slate-900">
                          {uiCopy.emailLabel}
                        </Label>
                        <div className="relative">
                          <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            id="email"
                            type="email"
                            value={form.email}
                            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                            className="h-12 rounded-[10px] border-[#e2e8f0] bg-white pl-11 text-slate-950 placeholder:text-slate-400 transition duration-200 focus-visible:border-[#1e40af] focus-visible:ring-2 focus-visible:ring-[#1e40af]/15"
                            placeholder={text.fields.emailPlaceholder}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-slate-900">
                        {uiCopy.passwordLabel}
                      </Label>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="password"
                          type="password"
                          value={form.password}
                          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                          className="h-12 rounded-[10px] border-[#e2e8f0] bg-white pl-11 text-slate-950 placeholder:text-slate-400 transition duration-200 focus-visible:border-[#1e40af] focus-visible:ring-2 focus-visible:ring-[#1e40af]/15"
                          placeholder={text.fields.signupPasswordPlaceholder}
                          required
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-slate-900">
                        {uiCopy.emailLabel}
                      </Label>
                      <div className="relative">
                        <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                          className="h-12 rounded-[10px] border-[#e2e8f0] bg-white pl-11 text-slate-950 placeholder:text-slate-400 transition duration-200 focus-visible:border-[#1e40af] focus-visible:ring-2 focus-visible:ring-[#1e40af]/15"
                          placeholder={text.fields.emailPlaceholder}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-slate-900">
                        {uiCopy.passwordLabel}
                      </Label>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="password"
                          type="password"
                          value={form.password}
                          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                          className="h-12 rounded-[10px] border-[#e2e8f0] bg-white pl-11 text-slate-950 placeholder:text-slate-400 transition duration-200 focus-visible:border-[#1e40af] focus-visible:ring-2 focus-visible:ring-[#1e40af]/15"
                          placeholder={text.fields.loginPasswordPlaceholder}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  className="h-12 w-full rounded-full bg-[#1e40af] text-white transition duration-200 hover:-translate-y-px hover:bg-[#1e3a8a]"
                  disabled={loading}
                >
                  {loading ? (
                    <Spinner label={mode === 'login' ? text.submit.loadingLogin : text.submit.loadingSignup} />
                  ) : mode === 'login' ? (
                    uiCopy.loginButton
                  ) : (
                    uiCopy.signupButton
                  )}
                </Button>

                <div className="rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                  <div className="flex items-start gap-3">
                    <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#1e40af]" />
                    <span>{uiCopy.officialNote}</span>
                  </div>
                </div>

                <div className="text-center text-sm leading-6 text-slate-600">
                  {uiCopy.bottomPrefix}{' '}
                  <button
                    type="button"
                    onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                    className="font-semibold text-[#1e40af] underline-offset-4 hover:underline"
                  >
                    {uiCopy.bottomAction}
                  </button>
                  {uiCopy.bottomSuffix ? ` ${uiCopy.bottomSuffix}` : null}
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>

      <style jsx>{`
        :global(html),
        :global(body) {
          height: 100%;
          margin: 0;
          overflow-x: hidden;
          overflow-y: auto;
        }

        .main-container {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          flex: 1 1 auto;
          min-height: 0;
        }

        .citizen-auth-container {
          flex: 1 1 auto;
          min-height: 0;
        }

        .left,
        .right {
          min-width: 0;
          min-height: 0;
        }

        .citizen-auth-left,
        .citizen-auth-right {
          height: 100%;
        }

        .left-content {
          position: relative;
          z-index: 3;
          backdrop-filter: blur(2px);
        }

        .right {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: #f8fafc;
          position: relative;
        }

        .login-card {
          width: 100%;
          max-width: 620px;
          min-height: auto;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 24px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: none;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.94));
          backdrop-filter: blur(8px);
        }

        @media (max-width: 768px) {
          :global(html),
          :global(body) {
            overflow-y: auto;
          }

          .main-container {
            display: flex;
            flex-direction: column;
            flex: 1 1 auto;
            min-height: auto;
          }

          .citizen-auth-container {
            min-height: auto;
          }

          .left {
            height: 40vh;
            min-height: 40vh;
          }

          .right {
            height: auto;
            min-height: auto;
            padding: 20px;
          }

          .login-card {
            height: auto;
            min-height: auto;
            max-width: 100%;
          }
        }

        @media (max-width: 320px) {
          .login-wrapper,
          .login-card {
            padding: 16px;
          }
        }
      `}</style>
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
