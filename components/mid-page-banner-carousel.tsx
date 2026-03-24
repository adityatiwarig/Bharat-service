'use client'

import { memo, startTransition, useEffect, useEffectEvent, useRef, useState, type FocusEvent } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

const slides = [
  {
    image: '/images/banner1.webp',
    alt: 'Citizens using a digital governance service interface',
  },
  {
    image: '/images/banner2.webp',
    alt: 'Municipal public service staff supporting grievance resolution',
  },
  {
    image: '/images/banner3.webp',
    alt: 'Public infrastructure and governance support services',
  },
] as const

type MidPageBannerCarouselProps = {
  primaryHref: string
  trackerHref: string
}

export function MidPageBannerCarousel({ primaryHref, trackerHref }: MidPageBannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentIndexRef = useRef(0)
  const isPausedRef = useRef(false)
  const isAnimatingRef = useRef(false)
  const intervalRef = useRef<number | null>(null)
  const transitionTimeoutRef = useRef<number | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const animateToIndex = useEffectEvent((nextIndex: number) => {
    const imageElement = imageRef.current

    if (!imageElement || isAnimatingRef.current || nextIndex === currentIndexRef.current) {
      return
    }

    isAnimatingRef.current = true
    imageElement.style.opacity = '0'
    imageElement.style.transform = 'scale(1.03)'

    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current)
    }

    transitionTimeoutRef.current = window.setTimeout(() => {
      currentIndexRef.current = nextIndex
      startTransition(() => {
        setCurrentIndex(nextIndex)
      })

      window.requestAnimationFrame(() => {
        const updatedImageElement = imageRef.current

        if (!updatedImageElement) {
          isAnimatingRef.current = false
          return
        }

        updatedImageElement.style.opacity = '1'
        updatedImageElement.style.transform = 'scale(1.08)'
        isAnimatingRef.current = false
      })
    }, 300)
  })

  const shiftSlide = useEffectEvent((step: 1 | -1) => {
    const nextIndex = step === -1
      ? (currentIndexRef.current - 1 + slides.length) % slides.length
      : (currentIndexRef.current + 1) % slides.length

    animateToIndex(nextIndex)
  })

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      if (!isPausedRef.current) {
        shiftSlide(1)
      }
    }, 4000)

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
      }

      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [])

  const activeSlide = slides[currentIndex]

  function handleDotClick(targetIndex: number) {
    animateToIndex(targetIndex)
  }

  function handleBlurCapture(event: FocusEvent<HTMLElement>) {
    const nextFocusedElement = event.relatedTarget

    if (!(nextFocusedElement instanceof Node) || !event.currentTarget.contains(nextFocusedElement)) {
      isPausedRef.current = false
    }
  }

  return (
    <section className="bg-[#f8fafc] py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="gov-carousel-stage rounded-[28px] px-6 py-8 sm:px-7 sm:py-9 lg:px-10 lg:py-12">
          <div
            className="gov-carousel-shell relative overflow-hidden rounded-[12px] shadow-[0_18px_46px_rgba(15,23,42,0.12)] ring-1 ring-[#d8e1ea]"
            onMouseEnter={() => {
              isPausedRef.current = true
            }}
            onMouseLeave={() => {
              isPausedRef.current = false
            }}
            onFocusCapture={() => {
              isPausedRef.current = true
            }}
            onBlurCapture={handleBlurCapture}
          >
            <div className="relative z-[2] grid min-h-[440px] lg:min-h-[470px] lg:grid-cols-[1.5fr_1fr]">
              <div className="relative min-h-[250px] overflow-hidden md:min-h-[320px] lg:min-h-full">
                <img
                  ref={imageRef}
                  src={activeSlide.image}
                  alt={activeSlide.alt}
                  className="absolute inset-0 h-full w-full object-cover brightness-[0.9] contrast-[1.05]"
                  style={{
                    opacity: 1,
                    transform: 'scale(1.08)',
                    transition: 'opacity 0.6s ease-in-out, transform 0.6s ease-in-out',
                  }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.35),rgba(0,0,0,0.05))]" />

                <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-20 flex items-center justify-between px-4">
                  <button
                    type="button"
                    onClick={() => shiftSlide(-1)}
                    className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(0,0,0,0.4)] text-white transition duration-200 ease-in-out hover:scale-[1.05] hover:bg-[#ff5722] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                    aria-label="Show previous banner"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftSlide(1)}
                    className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(0,0,0,0.4)] text-white transition duration-200 ease-in-out hover:scale-[1.05] hover:bg-[#ff5722] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                    aria-label="Show next banner"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="gov-carousel-copy-panel flex items-center px-6 py-10 sm:px-8 lg:px-10">
                <CarouselContent primaryHref={primaryHref} trackerHref={trackerHref} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2">
          {slides.map((slide, slideIndex) => {
            const isActive = slideIndex === currentIndex

            return (
              <button
                key={slide.image}
                type="button"
                onClick={() => handleDotClick(slideIndex)}
                className={`h-2.5 rounded-full transition-all duration-300 ease-in-out ${
                  isActive ? 'w-8 bg-[#ff5722]' : 'w-2.5 bg-[#cbd5e1] hover:bg-[#94a3b8]'
                }`}
                aria-label={`Go to banner ${slideIndex + 1}`}
                aria-current={isActive}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}

const CarouselContent = memo(function CarouselContent({ primaryHref, trackerHref }: MidPageBannerCarouselProps) {
  return (
    <div className="gov-banner-copy w-full text-center lg:text-left">
      <div className="text-sm font-semibold tracking-[0.2em] text-[#0b3c5d] uppercase">
        Digital Public Services
      </div>
      <h3 className="mt-4 text-3xl font-bold tracking-tight text-[#0f172a] sm:text-[2.15rem]">
        Empowering Citizens Through Digital Governance
      </h3>
      <p className="mt-4 max-w-xl text-base leading-7 text-[#475569] lg:max-w-md">
        Register complaints, track progress, and ensure accountability.
      </p>

      <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
        <Button
          asChild
          className="h-11 rounded-full bg-[#ff5722] px-5 text-white shadow-[0_12px_24px_rgba(255,87,34,0.2)] transition duration-200 ease-in-out hover:scale-[1.05] hover:bg-[#ff5722] hover:shadow-[0_0_0_1px_rgba(255,87,34,0.18),0_0_24px_rgba(255,87,34,0.24)]"
        >
          <Link href={primaryHref}>Lodge Complaint</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-11 rounded-full border-[#0f172a] bg-transparent px-5 text-[#0f172a] shadow-none transition duration-200 ease-in-out hover:scale-[1.05] hover:border-[#0f172a] hover:bg-[#0f172a] hover:text-white"
        >
          <Link href={trackerHref}>Track Status</Link>
        </Button>
      </div>
    </div>
  )
})
