'use client'

import { useEffect, useRef, useState } from 'react'

export function ScrollProgressBar() {
  const ticking = useRef(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight
      const nextProgress = documentHeight > 0 ? Math.min((scrollTop / documentHeight) * 100, 100) : 0

      setProgress(nextProgress)
      ticking.current = false
    }

    const requestUpdate = () => {
      if (ticking.current) {
        return
      }

      ticking.current = true
      window.requestAnimationFrame(updateProgress)
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
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 bg-transparent">
      <div
        className="h-full origin-left bg-[linear-gradient(90deg,#ff9933_0%,#ffffff_48%,#138808_100%)] shadow-[0_1px_6px_rgba(11,60,93,0.22)] transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  )
}
