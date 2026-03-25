'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Landmark, LockKeyhole, Shield, UserCog, Users } from 'lucide-react';
import { toast } from 'sonner';

import { useLandingLanguage } from '@/components/landing-language';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SiteLanguageToggle } from '@/components/site-language-toggle';
import { Spinner } from '@/components/ui/spinner';

const TEXT = {
  en: {
    panels: [
      {
        title: 'L1 Dashboard',
        description: 'Initial complaint handling for mapped ward and department complaints.',
        icon: Users,
      },
      {
        title: 'L2 Dashboard',
        description: 'Monitoring and review desk for complaints whose L1 field window has expired.',
        icon: Shield,
      },
      {
        title: 'L3 Dashboard',
        description: 'Final monitoring and closure review desk for complaints delayed beyond L2 review.',
        icon: UserCog,
      },
      {
        title: 'Admin Panel',
        description: 'System-wide monitoring and administrative control for officer operations.',
        icon: Landmark,
      },
    ],
    loginError: 'Unable to login.',
    loginSuccess: 'Officer login successful.',
    checkingSession: 'Checking your session...',
    officialAccess: 'Official Officer Access',
    authorizedOnly: 'Authorized Personnel Only',
    backToHome: 'Back to citizen home',
    securedLogin: 'JWT-secured officer and admin login',
    heroTitle: 'Single login for L1, L2, L3, and Admin panels',
    heroDescription:
      'Officer accounts are created directly from mapping data. Use the generated credentials TXT file and sign in with either the short Login ID or the full seeded email.',
    seededFormat: 'Seeded Officer Format',
    seededDescriptionOne:
      'Officer logins are unique per role, ward, department, and category. The generated pattern is:',
    seededDescriptionTwo:
      'A ready-to-share file is generated at OFFICER_LOGIN_CREDENTIALS.txt with officer name, login ID, full email, password, and mapping scope.',
    seededDescriptionThree: 'Default seeded password is 123456 until you rotate it.',
    credentialsOnly: 'Officer credentials only',
    signInTitle: 'Officer Sign In',
    redirectInfo:
      'After successful login, the API returns a JWT session and redirects automatically: L1 to /l1, L2 to /l2, L3 to /l3, and ADMIN to /admin.',
    loginIdOrEmail: 'Login ID or Email',
    loginPlaceholder: 'l1_rohini_sector_1_cleanliness_dead_animals',
    password: 'Password',
    passwordPlaceholder: 'Enter officer password',
    signingIn: 'Signing in...',
    proceed: 'Proceed to Officer Panel',
    citizenNotice: 'Citizens should continue using the public portal. This page is only for L1, L2, L3, and admin officer accounts.',
    lookingForCitizen: 'Looking for citizen access?',
    goToCitizenPortal: 'Go to Citizen Portal',
  },
  hi: {
    panels: [
      {
        title: 'L1 डैशबोर्ड',
        description: 'मैप किए गए वार्ड और विभाग की शिकायतों के लिए प्रारंभिक निपटान डेस्क।',
        icon: Users,
      },
      {
        title: 'L2 डैशबोर्ड',
        description: 'उन शिकायतों के लिए मॉनिटरिंग और समीक्षा डेस्क जिनकी L1 फील्ड समय-सीमा समाप्त हो चुकी है।',
        icon: Shield,
      },
      {
        title: 'L3 डैशबोर्ड',
        description: 'L2 समीक्षा से आगे विलंबित शिकायतों के लिए अंतिम मॉनिटरिंग और समापन समीक्षा डेस्क।',
        icon: UserCog,
      },
      {
        title: 'एडमिन पैनल',
        description: 'अधिकारी संचालन के लिए सिस्टम-स्तरीय मॉनिटरिंग और प्रशासनिक नियंत्रण।',
        icon: Landmark,
      },
    ],
    loginError: 'लॉगिन नहीं हो सका।',
    loginSuccess: 'अधिकारी लॉगिन सफल रहा।',
    checkingSession: 'आपका सत्र जांचा जा रहा है...',
    officialAccess: 'आधिकारिक अधिकारी प्रवेश',
    authorizedOnly: 'केवल अधिकृत कर्मियों के लिए',
    backToHome: 'नागरिक होम पर वापस जाएं',
    securedLogin: 'JWT-सुरक्षित अधिकारी और एडमिन लॉगिन',
    heroTitle: 'L1, L2, L3 और एडमिन पैनलों के लिए एकल लॉगिन',
    heroDescription:
      'अधिकारी खाते सीधे मैपिंग डेटा से बनाए जाते हैं। जनरेट की गई क्रेडेंशियल TXT फ़ाइल का उपयोग करें और छोटे लॉगिन आईडी या पूर्ण सीडेड ईमेल से साइन इन करें।',
    seededFormat: 'सीडेड अधिकारी प्रारूप',
    seededDescriptionOne:
      'अधिकारी लॉगिन भूमिका, वार्ड, विभाग और श्रेणी के अनुसार अद्वितीय होते हैं। तैयार पैटर्न यह है:',
    seededDescriptionTwo:
      'OFFICER_LOGIN_CREDENTIALS.txt नाम की एक साझा करने योग्य फ़ाइल बनाई जाती है, जिसमें अधिकारी का नाम, लॉगिन आईडी, पूरा ईमेल, पासवर्ड और मैपिंग स्कोप होता है।',
    seededDescriptionThree: 'डिफ़ॉल्ट सीडेड पासवर्ड 123456 है, जब तक आप उसे बदल न दें।',
    credentialsOnly: 'केवल अधिकारी क्रेडेंशियल',
    signInTitle: 'अधिकारी साइन इन',
    redirectInfo:
      'सफल लॉगिन के बाद API JWT सत्र देता है और स्वतः रीडायरेक्ट करता है: L1 को /l1, L2 को /l2, L3 को /l3, और ADMIN को /admin।',
    loginIdOrEmail: 'लॉगिन आईडी या ईमेल',
    loginPlaceholder: 'l1_rohini_sector_1_cleanliness_dead_animals',
    password: 'पासवर्ड',
    passwordPlaceholder: 'अधिकारी पासवर्ड दर्ज करें',
    signingIn: 'साइन इन हो रहा है...',
    proceed: 'अधिकारी पैनल पर जाएं',
    citizenNotice: 'नागरिकों को सार्वजनिक पोर्टल का उपयोग जारी रखना चाहिए। यह पेज केवल L1, L2, L3 और एडमिन अधिकारी खातों के लिए है।',
    lookingForCitizen: 'क्या आप नागरिक प्रवेश ढूंढ रहे हैं?',
    goToCitizenPortal: 'नागरिक पोर्टल पर जाएं',
  },
} as const;

export default function WorkerLoginPage() {
  const { language } = useLandingLanguage();
  const text = TEXT[language];
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
        throw new Error(data.error || text.loginError);
      }

      const redirectTo = data.redirect_to || data.user?.redirect_to || '/admin';
      toast.success(text.loginSuccess);
      window.location.assign(redirectTo);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.loginError);
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_52%,#f6f8fc_100%)]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white px-6 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <Spinner label={text.checkingSession} />
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
            <span className="font-semibold tracking-[0.08em] uppercase">{text.officialAccess}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-white/90 sm:block">{text.authorizedOnly}</div>
            <SiteLanguageToggle />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-10">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#334155] transition hover:text-[#0b3d91]">
            <ArrowLeft className="h-4 w-4" />
            {text.backToHome}
          </Link>

          <div className="mt-5 inline-flex items-center gap-2 rounded-sm border border-[#cbd5e1] bg-white px-3 py-2 text-sm text-[#334155]">
            <LockKeyhole className="h-4 w-4 text-[#0b3d91]" />
            {text.securedLogin}
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#111827] lg:text-5xl">
            {text.heroTitle}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#475569]">{text.heroDescription}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {text.panels.map((panel) => {
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
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">{text.seededFormat}</div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {text.seededDescriptionOne} <span className="font-semibold text-slate-900">`l1_ward_department_category`</span> or{' '}
              <span className="font-semibold text-slate-900">`l1_ward_department_category@crm.com`</span>.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{text.seededDescriptionTwo}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{text.seededDescriptionThree}</p>
          </div>
        </div>

        <div className="self-start lg:sticky lg:top-24">
          <Card className="mx-auto w-full max-w-xl rounded-[1.5rem] border-[#d1d5db] bg-white shadow-none">
            <CardHeader className="border-b border-[#e5e7eb]">
              <CardDescription className="text-sm text-[#64748b]">{text.credentialsOnly}</CardDescription>
              <CardTitle className="text-3xl font-bold text-[#111827]">{text.signInTitle}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="rounded-[1.25rem] border border-[#dbeafe] bg-[#f8fbff] px-4 py-4 text-sm leading-6 text-[#475569]">
                  {text.redirectInfo}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-[#111827]">
                    {text.loginIdOrEmail}
                  </Label>
                  <Input
                    id="email"
                    type="text"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="h-11 rounded-xl border-[#cbd5e1] bg-white text-[#111827] placeholder:text-[#94a3b8] focus-visible:border-[#0b3d91] focus-visible:ring-[#0b3d91]"
                    placeholder={text.loginPlaceholder}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-[#111827]">
                    {text.password}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    className="h-11 rounded-xl border-[#cbd5e1] bg-white text-[#111827] placeholder:text-[#94a3b8] focus-visible:border-[#0b3d91] focus-visible:ring-[#0b3d91]"
                    placeholder={text.passwordPlaceholder}
                    required
                  />
                </div>

                <Button type="submit" className="h-12 w-full rounded-full bg-[#0b3d91] text-white hover:bg-[#082f6b]" disabled={loading}>
                  {loading ? <Spinner label={text.signingIn} /> : text.proceed}
                </Button>

                <div className="rounded-[1.25rem] border border-[#e5e7eb] bg-[#f8fafc] px-4 py-4 text-sm leading-6 text-[#475569]">
                  {text.citizenNotice}
                </div>

                <div className="text-center text-sm text-[#475569]">
                  {text.lookingForCitizen}{' '}
                  <Link href="/auth?mode=signup" className="font-semibold text-[#0b3d91] underline-offset-4 hover:underline">
                    {text.goToCitizenPortal}
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
