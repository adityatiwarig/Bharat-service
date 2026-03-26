'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Landmark, LockKeyhole, Shield, UserCog, Users } from 'lucide-react';
import { toast } from 'sonner';

import { useLandingLanguage } from '@/components/landing-language';
import { Button } from '@/components/ui/button';
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
      'Authorized personnel can securely access their dashboard to review and resolve complaints.',
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
  const topHeaderTitle =
    language === 'hi'
      ? 'आधिकारिक नगर नागरिक शिकायत पोर्टल'
      : 'Official Municipal Citizen Grievance Portal';
  const topHeaderHelpdesk =
    language === 'hi' ? 'नागरिक हेल्पडेस्क: 1800-100-2024' : 'Citizen Helpdesk: 1800-100-2024';
  const leftPortalTitle = language === 'hi' ? 'सार्वजनिक शिकायत पोर्टल' : 'Public Grievance Portal';
  const leftPortalSubtitle =
    language === 'hi'
      ? 'शिकायत प्रबंधन प्रणाली के लिए सुरक्षित अधिकारी प्रवेश'
      : 'Secure officer access for complaint management system';
  const redirectInfoMessage =
    language === 'hi'
      ? 'अधिकृत कर्मियों को शिकायतों की समीक्षा और समाधान के लिए अपने डैशबोर्ड तक सुरक्षित प्रवेश मिलता है।'
      : text.redirectInfo;
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
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#eff4ff_0%,#f8fbff_45%,#f6f8fc_100%)] px-4">
        <div className="rounded-[16px] border border-slate-200 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)] sm:px-6 sm:py-5">
          <Spinner label={text.checkingSession} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-950">
      <div className="portal-topbar border-b border-slate-200/80">
        <div className="mx-auto flex min-h-9 max-w-[1600px] items-center justify-between gap-4 px-4 py-1 text-sm font-medium text-[#0b3c5d] sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 truncate">
            <Landmark className="h-4 w-4 shrink-0" />
            <span className="truncate">{topHeaderTitle}</span>
          </div>
          <div className="shrink-0 text-right text-[#0b3c5d]">{topHeaderHelpdesk}</div>
        </div>
      </div>

      <main className="main-container officer-login-container">
        <section
          className="left officer-login-left relative flex h-[40vh] min-h-[320px] items-end overflow-hidden bg-cover bg-center bg-no-repeat px-6 py-8 sm:px-8 sm:py-10 md:h-full md:min-h-0 md:px-10 md:pb-24 md:pt-8 lg:px-12"
          style={{ backgroundImage: "url('/images/india-gov.webp')" }}
        >
          <div
            className="left-content max-w-lg"
            style={{ animation: 'officer-login-fade 700ms ease-out both' }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold tracking-[0.18em] uppercase text-white/90">
              <Landmark className="h-4 w-4" />
              {text.officialAccess}
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
              {leftPortalTitle}
            </h1>
            <div className="mt-4 flex items-center gap-3">
              <span className="h-1 w-24 rounded-full bg-[#ff9933]" />
              <span className="h-1 w-28 rounded-full bg-white/90" />
              <span className="h-1 w-24 rounded-full bg-[#138808]" />
            </div>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/90 sm:text-lg">
              {leftPortalSubtitle}
            </p>
          </div>
        </section>

        <section className="right officer-login-right relative flex min-h-[60vh] items-center justify-center bg-[#f8fafc] px-5 py-8 sm:px-6 md:h-full md:min-h-0 md:px-8 md:py-10">
          <div
            className="login-card login-wrapper relative z-10 w-full p-5 sm:p-6 md:p-8"
            style={{ animation: 'officer-login-fade 820ms ease-out both' }}
          >
            <div className="flex items-start justify-between gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#1e40af]"
              >
                <ArrowLeft className="h-4 w-4" />
                {text.backToHome}
              </Link>
              <div className="shrink-0">
                <SiteLanguageToggle />
              </div>
            </div>

            <div className="mx-auto w-full max-w-[500px]">
              <div>
                <div className="text-xs font-semibold tracking-[0.22em] text-[#1e40af]/75 uppercase">
                  {text.authorizedOnly}
                </div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 md:text-[2.25rem]">
                  {text.signInTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{text.authorizedOnly}</p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div className="rounded-[10px] border border-[#dbeafe] bg-[#f8fbff] px-4 py-4 text-sm leading-6 text-slate-600">
                  {redirectInfoMessage}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-900">
                    {text.loginIdOrEmail}
                  </Label>
                  <div className="relative">
                    <UserCog className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="text"
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      className="h-12 rounded-[10px] border-[#e2e8f0] bg-white pl-11 text-slate-950 placeholder:text-slate-400 transition duration-200 focus-visible:border-[#1e40af] focus-visible:ring-2 focus-visible:ring-[#1e40af]/20"
                      placeholder={text.loginPlaceholder}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-900">
                    {text.password}
                  </Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      value={form.password}
                      onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                      className="h-12 rounded-[10px] border-[#e2e8f0] bg-white pl-11 text-slate-950 placeholder:text-slate-400 transition duration-200 focus-visible:border-[#1e40af] focus-visible:ring-2 focus-visible:ring-[#1e40af]/20"
                      placeholder={text.passwordPlaceholder}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-full bg-[#1e40af] text-white transition duration-200 hover:-translate-y-px hover:bg-[#1e3a8a]"
                  disabled={loading}
                >
                  {loading ? <Spinner label={text.signingIn} /> : text.proceed}
                </Button>

                <div className="rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                  {text.citizenNotice}
                </div>

                <div className="text-center text-sm text-slate-600">
                  {text.lookingForCitizen}{' '}
                  <Link href="/auth?mode=signup" className="font-semibold text-[#1e40af] underline-offset-4 hover:underline">
                    {text.goToCitizenPortal}
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>

      <style jsx>{`
        @keyframes officer-login-fade {
          from {
            opacity: 0;
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

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

        .portal-topbar {
          background: linear-gradient(90deg, #ffb257 0%, #fff8ef 18%, #eef8ff 52%, #ddf4df 76%, #4dac48 100%);
          box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.85);
        }

        .officer-login-container {
          flex: 1 1 auto;
          min-height: 0;
        }

        .left,
        .right {
          min-width: 0;
          min-height: 0;
        }

        .officer-login-left,
        .officer-login-right {
          height: 100%;
        }

        .officer-login-left::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(15, 40, 80, 0.75);
          z-index: 1;
        }

        .officer-login-left::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px);
          background-size: 18px 18px;
          opacity: 0.6;
          z-index: 2;
        }

        .left-content {
          position: relative;
          z-index: 3;
          backdrop-filter: blur(2px);
        }

        .officer-login-left h1,
        .officer-login-left p,
        .officer-login-left span {
          color: rgba(255, 255, 255, 0.95);
        }

        .officer-login-right::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px);
          background-size: 18px 18px;
          opacity: 0.4;
          pointer-events: none;
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

          .officer-login-container {
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
