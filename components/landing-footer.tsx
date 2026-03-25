'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  CircleHelp,
  FileText,
  Mail,
  MapPin,
  Phone,
  Scale,
  SearchCheck,
  ShieldCheck,
} from 'lucide-react'

import { useLandingLanguage } from '@/components/landing-language'

const importantLinks = [
  { label: 'National Portal of India', href: 'https://www.india.gov.in' },
  { label: 'Digital India', href: 'https://www.digitalindia.gov.in' },
  { label: 'Delhi Govt', href: 'https://delhi.gov.in' },
]

type LandingFooterProps = {
  lastUpdated: string
}

export function LandingFooter({ lastUpdated }: LandingFooterProps) {
  const { t } = useLandingLanguage()

  const citizenLinks = [
    { label: t.footer.citizenLinks.lodgeComplaint, href: '/citizen/submit', icon: FileText },
    { label: t.footer.citizenLinks.trackComplaint, href: '/track', icon: SearchCheck },
    { label: t.footer.citizenLinks.faqs, href: '#footer-faqs', icon: CircleHelp },
    { label: t.footer.citizenLinks.howItWorks, href: '#how-it-works', icon: ShieldCheck },
  ]

  const policyLinks = [
    { label: t.footer.policyLinks.privacyPolicy, href: '#footer-privacy', icon: ShieldCheck },
    { label: t.footer.policyLinks.terms, href: '#footer-terms', icon: Scale },
    { label: t.footer.policyLinks.disclaimer, href: '#footer-disclaimer', icon: FileText },
  ]

  return (
    <footer className="border-t border-[#1a2d46] bg-[#0c1a2b] text-[#d8e4f0]">
      <div className="h-1 w-full bg-[linear-gradient(90deg,#ff9933_0%,#ffffff_50%,#138808_100%)]" />

      <div className="border-b border-[#1a2d46] bg-[#101f32]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="text-sm font-semibold tracking-[0.14em] text-white uppercase">
            {t.footer.topTitle}
          </div>
          <div className="mt-1 text-sm text-slate-300">{t.footer.topSubtitle}</div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 border-b border-[#1a2d46] pb-8 md:grid-cols-2 xl:grid-cols-4">
          <FooterColumn title={t.footer.about}>
            <div className="space-y-3">
              <div className="text-lg font-semibold text-white">{t.footer.aboutTitle}</div>
              <p className="max-w-sm text-sm leading-7 text-slate-300">{t.footer.aboutDescription}</p>
            </div>
          </FooterColumn>

          <FooterColumn title={t.footer.citizenServices}>
            {citizenLinks.map((item) => (
              <FooterLink key={item.label} href={item.href} icon={item.icon}>
                {item.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title={t.footer.policies}>
            {policyLinks.map((item) => (
              <FooterLink key={item.label} href={item.href} icon={item.icon}>
                {item.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title={t.footer.contactAuthority}>
            <div className="space-y-3 text-sm leading-7 text-slate-300">
              <div>
                <div className="font-semibold text-white">{t.footer.ownedBy}</div>
                <div>{t.header.mcd}</div>
              </div>
              <div>
                <div className="font-semibold text-white">{t.footer.developedBy}</div>
                <div>NIC / GovCRM Unit</div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#ff9933]" />
                <span>Civic Centre, Delhi</span>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="mt-1 h-4 w-4 shrink-0 text-[#ff9933]" />
                <span>support@gov.in</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="mt-1 h-4 w-4 shrink-0 text-[#ff9933]" />
                <span>1800-100-2024</span>
              </div>
            </div>
          </FooterColumn>
        </div>

        <div className="border-b border-[#1a2d46] py-4">
          <div className="text-xs font-semibold tracking-[0.14em] text-white uppercase">{t.footer.importantLinks}</div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300">
            {importantLinks.map((item, index) => (
              <span key={item.label} className="flex items-center gap-4">
                <a href={item.href} target="_blank" rel="noreferrer" className="transition hover:text-white hover:underline">
                  {item.label}
                </a>
                {index < importantLinks.length - 1 ? <span className="text-slate-600">|</span> : null}
              </span>
            ))}
          </div>
        </div>

        <div className="border-b border-[#1a2d46] py-4">
          <div id="footer-disclaimer" className="text-xs font-semibold tracking-[0.14em] text-white uppercase">
            {t.footer.disclaimer}
          </div>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">{t.footer.disclaimerText}</p>
        </div>

        <div className="flex flex-col gap-3 py-4 text-sm text-slate-300 lg:flex-row lg:items-center lg:justify-between">
          <div>(c) 2026 {t.header.mcd} | {t.footer.rightsReserved}</div>
          <div>{t.footer.lastUpdated}: {lastUpdated}</div>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-4 text-xs font-semibold tracking-[0.14em] text-white uppercase">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function FooterLink({
  href,
  icon: Icon,
  children,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  children: ReactNode
}) {
  const linkClass = 'flex items-center gap-2 py-1 text-sm text-slate-300 transition hover:text-white'

  if (href.startsWith('/')) {
    return (
      <Link href={href} className={linkClass}>
        <Icon className="h-4 w-4 text-[#ff9933]" />
        <span>{children}</span>
      </Link>
    )
  }

  return (
    <a href={href} className={linkClass}>
      <Icon className="h-4 w-4 text-[#ff9933]" />
      <span>{children}</span>
    </a>
  )
}
