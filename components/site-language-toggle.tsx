'use client'

import { useLandingLanguage } from '@/components/landing-language'
import { cn } from '@/lib/utils'

type SiteLanguageToggleProps = {
  className?: string
}

export function SiteLanguageToggle({ className }: SiteLanguageToggleProps) {
  const { language, setLanguage, t } = useLandingLanguage()

  return (
    <button
      type="button"
      aria-label="Toggle language"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 p-1 text-sm backdrop-blur-sm',
        className,
      )}
      onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
    >
      <span
        className={cn(
          'rounded-full px-3 py-1.5 transition',
          language === 'en'
            ? 'bg-[#0b3c5d] font-bold text-white shadow-sm ring-1 ring-[#0b3c5d]'
            : 'font-medium text-current/65',
        )}
      >
        {t.language.en}
      </span>
      <span
        className={cn(
          'rounded-full px-3 py-1.5 transition',
          language === 'hi'
            ? 'bg-[#0b3c5d] font-bold text-white shadow-sm ring-1 ring-[#0b3c5d]'
            : 'font-medium text-current/65',
        )}
      >
        {t.language.hi}
      </span>
    </button>
  )
}
