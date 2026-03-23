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

const citizenLinks = [
  { label: 'Lodge Complaint', href: '/citizen/submit', icon: FileText },
  { label: 'Track Complaint', href: '/track', icon: SearchCheck },
  { label: 'FAQs', href: '#footer-faqs', icon: CircleHelp },
  { label: 'How it Works', href: '#how-it-works', icon: ShieldCheck },
]

const policyLinks = [
  { label: 'Privacy Policy', href: '#footer-privacy', icon: ShieldCheck },
  { label: 'Terms & Conditions', href: '#footer-terms', icon: Scale },
  { label: 'Disclaimer', href: '#footer-disclaimer', icon: FileText },
]

const importantLinks = [
  { label: 'National Portal of India', href: 'https://www.india.gov.in' },
  { label: 'Digital India', href: 'https://www.digitalindia.gov.in' },
  { label: 'Delhi Govt', href: 'https://delhi.gov.in' },
]

type LandingFooterProps = {
  lastUpdated: string
}

export function LandingFooter({ lastUpdated }: LandingFooterProps) {
  return (
    <footer className="border-t border-[#1a2d46] bg-[#0c1a2b] text-[#d8e4f0]">
      <div className="h-1 w-full bg-[linear-gradient(90deg,#ff9933_0%,#ffffff_50%,#138808_100%)]" />

      <div className="border-b border-[#1a2d46] bg-[#101f32]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="text-sm font-semibold tracking-[0.14em] text-white uppercase">
            Government of NCT of Delhi | Municipal Corporation of Delhi
          </div>
          <div className="mt-1 text-sm text-slate-300">Official Public Grievance Redressal Portal</div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 border-b border-[#1a2d46] pb-8 md:grid-cols-2 xl:grid-cols-4">
          <FooterColumn title="About">
            <div className="space-y-3">
              <div className="text-lg font-semibold text-white">GovCRM Portal</div>
              <p className="max-w-sm text-sm leading-7 text-slate-300">
                Official grievance redressal system for citizens. Submit complaints, track status, and ensure
                accountability across departments.
              </p>
            </div>
          </FooterColumn>

          <FooterColumn title="Citizen Services">
            {citizenLinks.map((item) => (
              <FooterLink key={item.label} href={item.href} icon={item.icon}>
                {item.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Policies">
            {policyLinks.map((item) => (
              <FooterLink key={item.label} href={item.href} icon={item.icon}>
                {item.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Contact & Authority">
            <div className="space-y-3 text-sm leading-7 text-slate-300">
              <div>
                <div className="font-semibold text-white">Owned by:</div>
                <div>Municipal Corporation of Delhi</div>
              </div>
              <div>
                <div className="font-semibold text-white">Developed by:</div>
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
          <div className="text-xs font-semibold tracking-[0.14em] text-white uppercase">Important Links</div>
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
            Disclaimer
          </div>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
            This portal is intended for civic grievance redressal only. RTI matters, court cases, and policy issues are
            not handled here.
          </p>
        </div>

        <div className="flex flex-col gap-3 py-4 text-sm text-slate-300 lg:flex-row lg:items-center lg:justify-between">
          <div>(c) 2026 Municipal Corporation of Delhi | All Rights Reserved</div>
          <div>Last Updated: {lastUpdated}</div>
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
