'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Landmark, Languages } from 'lucide-react'

import { Button } from '@/components/ui/button'

const images = ['/images/hero1.jpg', '/images/hero2.jpg', '/images/hero3.jpg']
const heroHighlights = [
  { value: '1.2L+', label: 'Complaints Resolved' },
  { value: '72 hrs', label: 'Average SLA' },
  { value: '58K+', label: 'Active Citizens' },
  { value: '24x7', label: 'Availability' },
]

type HeroSliderSectionProps = {
  primaryHref: string
  trackerHref: string
}

export function HeroSliderSection({ primaryHref, trackerHref }: HeroSliderSectionProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length)
    }, 6000)

    return () => window.clearInterval(interval)
  }, [])

  return (
    <section className="relative flex min-h-[78vh] items-center justify-center overflow-visible lg:min-h-[88vh]">
      <div className="absolute inset-0">
        {images.map((image, imageIndex) => (
          <div
            key={image}
            className={`absolute inset-0 transition-[opacity,filter,transform] duration-[3000] ease-in-out ${
              index === imageIndex ? 'scale-100 opacity-100 blur-0' : 'scale-[1.035] opacity-0 blur-[6px]'
            }`}
          >
            <img
              src={image}
              alt=""
              className="h-full w-full scale-[1.02] object-cover object-center saturate-[1.08] contrast-[1.06]"
            />
          </div>
        ))}
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,10,24,0.28)_0%,rgba(7,19,41,0.44)_24%,rgba(8,18,39,0.7)_58%,rgba(5,12,26,0.92)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(40,86,198,0.16),transparent_30%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.12),transparent_22%),linear-gradient(90deg,rgba(8,20,42,0.42)_0%,rgba(8,20,42,0.08)_18%,rgba(8,20,42,0.08)_82%,rgba(8,20,42,0.42)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_18%,transparent_82%,rgba(255,255,255,0.03)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ff9933_0%,#ffffff_50%,#138808_100%)] opacity-95" />

      <div className="absolute right-6 top-10 hidden items-center gap-4 text-white lg:flex">
        <a href="#main-content" className="text-sm font-medium transition hover:text-white">
          Skip to main content
        </a>
        <div className="h-6 w-px bg-white/30" />
        <div className="flex items-center gap-3 text-white">
          <span className="text-xl">|</span>
          <Languages className="h-5 w-5" />
          <Landmark className="h-5 w-5" />
        </div>
      </div>

      <div className="relative mx-auto flex max-w-[96rem] flex-col items-center px-4 pb-4 pt-16 text-center text-white sm:px-6 lg:px-8 lg:pb-8 lg:pt-20">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/24 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.08)_100%)] backdrop-blur-sm shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
          <Landmark className="h-12 w-12" />
        </div>

        <div className="mt-6 text-sm font-semibold tracking-[0.32em] text-white uppercase drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          Municipal Corporation of Delhi
        </div>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm shadow-[0_12px_28px_rgba(0,0,0,0.2)]">
          <Landmark className="h-4 w-4" />
          Official Municipal Citizen Grievance Portal
        </div>

        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight text-white drop-shadow-[0_8px_26px_rgba(0,0,0,0.58)] sm:text-5xl lg:text-[3.45rem] lg:leading-[0.98]">
          Public Grievance Portal
        </h1>

        <div className="mt-4 flex items-center gap-3">
          <span className="h-1 w-24 rounded-full bg-[#ff9933]" />
          <span className="h-1 w-28 rounded-full bg-white/90" />
          <span className="h-1 w-24 rounded-full bg-[#138808]" />
        </div>

        <p className="mt-3 max-w-3xl text-base leading-7 text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.42)] sm:text-[1rem]">
          File and track complaints easily with transparency
        </p>

        <div className="mt-3 rounded-[28px] border border-white/14 bg-[linear-gradient(180deg,rgba(31,38,58,0.42)_0%,rgba(47,56,79,0.34)_100%)] px-5 py-4 backdrop-blur-md shadow-[0_24px_70px_rgba(0,0,0,0.26)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link href={primaryHref}>
              <Button
                size="lg"
                className="rounded-full bg-[#0b3c5d] px-8 text-white shadow-[0_16px_32px_rgba(8,19,36,0.28)] hover:bg-[#0a3350]"
              >
                Lodge Complaint
              </Button>
            </Link>
            <Link href={trackerHref}>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full border-white/60 bg-white/8 px-8 text-white backdrop-blur-sm hover:bg-white hover:text-[#0b3c5d]"
              >
                Track Complaint
              </Button>
            </Link>
          </div>

        </div>

      </div>

      <div className="absolute bottom-0 left-1/2 z-20 w-full -translate-x-1/2 translate-y-1/2 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl rounded-[22px] bg-[#f8fbff] p-3 shadow-[0_22px_60px_rgba(0,0,0,0.16)] ring-1 ring-[#e3e8ef] sm:p-3.5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {heroHighlights.map((item) => (
              <div key={item.label} className="border border-[#d9e2ea] bg-white px-8 py-3 text-slate-950">
                <div className="text-[10px] font-semibold tracking-[0.22em] text-[#0b3c5d] uppercase">
                  {item.label}
                </div>
                <div className="mt-1 text-[1.9rem] font-semibold leading-none text-slate-950 whitespace-nowrap">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
