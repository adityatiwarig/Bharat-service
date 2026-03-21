'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Landmark } from 'lucide-react'

import { Button } from '@/components/ui/button'

type PublicNavbarProps = {
  isLoggedIn: boolean
  primaryHref: string
  trackerHref: string
}

export function PublicNavbar({ isLoggedIn, primaryHref, trackerHref }: PublicNavbarProps) {
  const ticking = useRef(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const updateVisibility = () => {
      setVisible(window.scrollY > 36)
      ticking.current = false
    }

    const requestUpdate = () => {
      if (ticking.current) {
        return
      }

      ticking.current = true
      window.requestAnimationFrame(updateVisibility)
    }

    requestUpdate()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)

    return () => {
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
    }
  }, [])

  return (
    <div
      className={`fixed inset-x-0 top-0 z-60 transition duration-300 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div className="border-b border-[#d8e1ea] bg-[linear-gradient(90deg,#ff9933_0%,#fff8ee_24%,#ffffff_50%,#f5fff7_76%,#138808_100%)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-[11px] font-medium text-[#24415e] sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Landmark className="h-3.5 w-3.5" />
            <span>Official Municipal Citizen Grievance Portal</span>
          </div>
          <div className="hidden sm:block">Citizen Helpdesk: 1800-100-2024</div>
        </div>
      </div>

      <header className="border-b border-[#d8e1ea] bg-white/96 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-6">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d8e1ea] bg-[linear-gradient(180deg,#fffaf3_0%,#ffffff_100%)] text-[#0b3c5d] shadow-[0_4px_12px_rgba(11,60,93,0.08)]">
                <Landmark className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[11px] font-semibold tracking-[0.28em] text-[#0b3c5d] uppercase">
                  Government of NCT of Delhi
                </div>
                <div className="mt-0.5 truncate text-base font-semibold text-slate-950">Municipal Corporation of Delhi</div>
                <div className="text-[13px] text-slate-600">GovCRM Public Grievance Redressal Portal</div>
              </div>
            </Link>

            <div className="hidden items-center gap-5 lg:flex">
              <a href="#services" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">
                Complaint Categories
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">
                Process Flow
              </a>
              <Link href={trackerHref} className="text-sm font-medium text-slate-600 transition hover:text-slate-950">
                Track Complaint
              </Link>
              <Link href="/worker-login">
                <Button variant="outline" className="rounded-md border-[#c8d4df] px-4 text-[#0b3c5d] hover:bg-[#f8fbff]">
                  Officer Login
                </Button>
              </Link>
              <Link href={primaryHref}>
                <Button className="rounded-md bg-[#0b3c5d] px-4 text-white hover:bg-[#092f48]">Lodge Complaint</Button>
              </Link>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <Link href={primaryHref}>
                <Button className="rounded-md bg-[#0b3c5d] px-4 text-white hover:bg-[#092f48]">Citizen</Button>
              </Link>
              <Link href="/worker-login">
                <Button variant="outline" className="rounded-md border-[#c8d4df] px-4 text-[#0b3c5d] hover:bg-[#f8fbff]">
                  Officer
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>
    </div>
  )
}
