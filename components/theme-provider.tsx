'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

import { GuidedCitizenAssistant } from './chatbot'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      {children}
      <GuidedCitizenAssistant />
    </NextThemesProvider>
  )
}
