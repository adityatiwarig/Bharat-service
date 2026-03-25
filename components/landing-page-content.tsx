'use client'

import type { ComponentType } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Construction,
  FileText,
  MapPinned,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Volume2,
} from 'lucide-react'

import { DeferredLandingWardHeatmap } from '@/components/deferred-landing-ward-heatmap'
import { HeroSliderSection } from '@/components/hero-slider-section'
import { LandingFooter } from '@/components/landing-footer'
import { useLandingLanguage } from '@/components/landing-language'
import { MidPageBannerCarousel } from '@/components/mid-page-banner-carousel'

const citizenServiceIcons = [Building2, ShieldCheck, Trash2, MapPinned, Construction, Volume2]

type LandingPageContentProps = {
  primaryHref: string
  secondaryHref: string
  trackerHref: string
  lastUpdated: string
}

export function LandingPageContent({
  primaryHref,
  secondaryHref,
  trackerHref,
  lastUpdated,
}: LandingPageContentProps) {
  const { t } = useLandingLanguage()

  const portalActions = [
    {
      key: 'citizenLogin',
      title: t.page.portalActions.citizenLogin,
      description: t.page.portalActions.citizenLoginDescription,
      href: secondaryHref,
    },
    {
      key: 'lodgeComplaint',
      title: t.page.portalActions.lodgeComplaint,
      description: t.page.portalActions.lodgeComplaintDescription,
      href: primaryHref,
    },
    {
      key: 'trackComplaint',
      title: t.page.portalActions.trackComplaint,
      description: t.page.portalActions.trackComplaintDescription,
      href: trackerHref,
    },
  ]

  const infoRows = [
    {
      icon: FileText,
      title: t.page.infoRows.scopeTitle,
      description: t.page.infoRows.scopeDescription,
    },
    {
      icon: ShieldAlert,
      title: t.page.infoRows.legalTitle,
      description: t.page.infoRows.legalDescription,
    },
    {
      icon: ClipboardCheck,
      title: t.page.infoRows.proofTitle,
      description: t.page.infoRows.proofDescription,
    },
  ]

  return (
    <>
      <main>
        <HeroSliderSection primaryHref={primaryHref} trackerHref={trackerHref} />

        <section
          id="main-content"
          className="relative overflow-hidden border-b border-[#d8e1ea] bg-[linear-gradient(180deg,#fbfdff_0%,#f2f7fb_100%)] pt-32 lg:pt-34"
        >
          <div className="absolute inset-0 gov-portal-dots opacity-100" aria-hidden="true" />
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,#ff9933_0%,#ffffff_50%,#138808_100%)]" />

          <div className="mx-auto max-w-7xl px-4 py-[60px] sm:px-6 lg:px-8">
            <div className="relative grid gap-10 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-10 lg:px-8">
              <div className="space-y-5 lg:max-w-[33rem]">
                <div className="space-y-3">
                  <div className="text-sm font-semibold tracking-[0.2em] text-[#0b3c5d] uppercase">
                    {t.page.citizenServicesTag}
                  </div>
                  <h1 className="font-[Georgia,'Times_New_Roman',serif] text-[3rem] font-semibold leading-[0.98] tracking-[0.01em] text-slate-950 sm:text-[3.6rem] lg:text-[4rem]">
                    {t.page.citizenServicesTitleLine1}
                    <span className="mt-2 block text-[#0b3c5d]">{t.page.citizenServicesTitleLine2}</span>
                  </h1>
                  <div className="h-[3px] w-28 rounded-full bg-[linear-gradient(90deg,#ff9933_0%,#ffffff_50%,#138808_100%)]" />
                  <p className="max-w-xl text-lg leading-8 text-slate-600">{t.page.citizenServicesSubtitle}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:justify-items-center">
                {portalActions.map((action) => (
                  <Link
                    key={action.key}
                    href={action.href}
                    className="gov-portal-card group flex min-h-[220px] w-full max-w-[20rem] flex-col justify-between rounded-[1.5rem] p-7 text-slate-950 transition duration-300 ease-out hover:-translate-y-2 hover:border-[#ff5722] hover:shadow-[0_22px_44px_rgba(255,87,34,0.14)]"
                  >
                    <div className="space-y-4">
                      <div className="text-[11px] font-semibold tracking-[0.22em] text-[#0b3c5d] uppercase">
                        {t.page.citizenAction}
                      </div>
                      <div className="text-[1.85rem] font-semibold leading-[1.15] text-slate-950">{action.title}</div>
                    </div>
                    <div className="space-y-5">
                      <p className="text-[0.98rem] leading-7 text-slate-600">{action.description}</p>
                      <div className="flex items-center gap-2 text-base font-semibold text-[#c2410c]">
                        <span>{t.page.open}</span>
                        <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[1fr_0.95fr]">
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-semibold tracking-[0.24em] text-[#0b3c5d] uppercase">
                    {t.page.officialInformationTag}
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    {t.page.officialInformationTitle}
                  </h2>
                </div>

                <div className="grid gap-3">
                  {infoRows.map((item) => (
                    <InfoRow key={item.title} icon={item.icon} title={item.title} description={item.description} />
                  ))}
                </div>
              </div>

              <div className="bg-[#f8fafc] px-5 py-5 ring-1 ring-[#e0e8f0]">
                <div className="text-sm font-semibold tracking-[0.24em] text-[#0b3c5d] uppercase">{t.page.trustTag}</div>
                <div className="mt-4 grid gap-3">
                  {t.page.trustSignals.map((point) => (
                    <div key={point} className="flex items-start gap-3 bg-white px-4 py-3.5 ring-1 ring-[#d9e2ea]">
                      <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 text-emerald-600" />
                      <span className="text-sm leading-6 text-slate-700">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="relative bg-[#f7fafc] py-16">
          <div id="yojana" className="absolute -top-28" aria-hidden="true" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold tracking-[0.24em] text-[#0b3c5d] uppercase">{t.page.servicesTag}</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {t.page.servicesTitle}
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">{t.page.servicesSubtitle}</p>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {t.page.services.map((item, index) => {
                const Icon = citizenServiceIcons[index]

                return (
                  <div
                    key={item.title}
                    className="bg-white px-5 py-5 ring-1 ring-[#d9e2ea] transition hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(15,23,42,0.06)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#eef5fb] text-[#0b3c5d] ring-1 ring-[#d8e4ef]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-slate-950">{item.title}</div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <MidPageBannerCarousel primaryHref={primaryHref} trackerHref={trackerHref} />

        <section id="how-it-works" className="relative overflow-hidden bg-[#0f172a] py-16">
          <div className="absolute inset-0 gov-process-dots opacity-80" aria-hidden="true" />
          <div className="gov-process-glow absolute -left-20 top-20 h-72 w-72 rounded-full" aria-hidden="true" />
          <div className="gov-process-glow absolute -right-12 bottom-10 h-64 w-64 rounded-full opacity-60" aria-hidden="true" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold tracking-[0.24em] text-slate-300 uppercase">{t.page.howItWorksTag}</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {t.page.howItWorksTitle}
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-300">{t.page.howItWorksSubtitle}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="gov-process-stat rounded-[1.4rem] px-4 py-4">
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-300 uppercase">
                    {t.page.processStats.averageAction}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">{t.page.processStats.averageActionValue}</div>
                </div>
                <div className="gov-process-stat rounded-[1.4rem] px-4 py-4">
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-300 uppercase">
                    {t.page.processStats.tracking}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">{t.page.processStats.trackingValue}</div>
                </div>
                <div className="gov-process-stat rounded-[1.4rem] px-4 py-4">
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-300 uppercase">
                    {t.page.processStats.escalation}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">{t.page.processStats.escalationValue}</div>
                </div>
              </div>
            </div>

            <div className="relative mt-10">
              <div className="absolute bottom-6 left-10 top-6 w-px bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,87,34,0.4)_50%,rgba(255,255,255,0.14)_100%)] lg:hidden" />
              <div className="absolute left-[10%] right-[10%] top-7 hidden h-px bg-[linear-gradient(90deg,rgba(255,255,255,0.14)_0%,rgba(255,87,34,0.45)_50%,rgba(255,255,255,0.14)_100%)] lg:block" />

              <div className="grid gap-4 lg:grid-cols-5">
                {t.page.processSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className={`gov-process-card group relative rounded-[1.6rem] px-5 py-5 pl-24 transition duration-300 ease-out hover:-translate-y-1.5 lg:min-h-[17rem] lg:px-5 lg:pt-[4.5rem] ${
                      index === 0 ? 'gov-process-card-active' : ''
                    }`}
                  >
                    <div
                      className={`absolute left-[0.75rem] top-5 flex h-14 w-14 items-center justify-center rounded-full border text-sm font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.32)] lg:left-1/2 lg:top-0 lg:-translate-x-1/2 ${
                        index === 0
                          ? 'border-[#ff5722] bg-[#ff5722]/18 shadow-[0_0_0_1px_rgba(255,87,34,0.35),0_0_24px_rgba(255,87,34,0.28)]'
                          : 'border-white/18 bg-white/10'
                      }`}
                    >
                      <div className="absolute inset-[3px] rounded-full border border-white/12" />
                      <div className="relative">{String(index + 1).padStart(2, '0')}</div>
                    </div>

                    <div className="text-[11px] font-semibold tracking-[0.2em] text-[#ffb18f] uppercase">{step.timeline}</div>
                    <div className="mt-3 text-[1.35rem] font-semibold leading-8 text-white">{step.title}</div>
                    <p className="mt-3 max-w-[18rem] text-sm leading-7 text-slate-300">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="gov-directory-section overflow-hidden bg-[#f8fafc] py-16">
          <div className="relative z-[2] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[1.25rem] border border-[#cfd8e3] bg-white p-6 sm:p-8 lg:p-10">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold tracking-[0.24em] text-[#0b3c5d] uppercase">
                  {t.page.wardDistributionTag}
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  {t.page.wardDistributionTitle}
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-600">{t.page.wardDistributionSubtitle}</p>
              </div>

              <div className="mt-8">
                <DeferredLandingWardHeatmap />
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter lastUpdated={lastUpdated} />
    </>
  )
}

function InfoRow({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 bg-[#f8fafc] px-4 py-4 ring-1 ring-[#e0e8f0]">
      <div className="flex h-10 w-10 items-center justify-center bg-white text-[#0b3c5d] ring-1 ring-[#d8e4ef]">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-base font-semibold text-slate-950">{title}</div>
        <p className="mt-1.5 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  )
}
