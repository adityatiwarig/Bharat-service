'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { useLandingLanguage } from '@/components/landing-language';

const LandingWardHeatmap = dynamic(
  () => import('@/components/landing-ward-heatmap').then((mod) => mod.LandingWardHeatmap),
  {
    ssr: false,
    loading: () => <LandingWardHeatmapFallback />,
  },
);

type IdleWindow = Window & typeof globalThis & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function LandingWardHeatmapFallback() {
  const { t } = useLandingLanguage();

  return (
    <div className="relative overflow-hidden rounded-[1rem] border border-[#cfd8e3] bg-white">
      <div className="absolute left-4 top-4 z-[1] max-w-[14rem] rounded-[0.9rem] border border-[#cfd8e3] bg-white px-4 py-3 sm:left-6 sm:top-6">
        <div className="text-[11px] font-semibold tracking-[0.2em] text-[#0b3c5d] uppercase">{t.map.fallbackTitle}</div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t.map.fallbackDescription}</p>
      </div>

      <div
        className="h-[24rem] w-full bg-[#f8fafc] sm:h-[28rem] lg:h-[34rem]"
        aria-hidden="true"
      />
    </div>
  );
}

export function DeferredLandingWardHeatmap() {
  const [shouldRenderMap, setShouldRenderMap] = useState(false);

  useEffect(() => {
    const idleWindow = window as IdleWindow;

    if (typeof idleWindow.requestIdleCallback === 'function') {
      const idleHandle = idleWindow.requestIdleCallback(() => {
        setShouldRenderMap(true);
      }, { timeout: 1200 });

      return () => {
        idleWindow.cancelIdleCallback?.(idleHandle);
      };
    }

    const timeoutHandle = window.setTimeout(() => {
      setShouldRenderMap(true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutHandle);
    };
  }, []);

  if (!shouldRenderMap) {
    return <LandingWardHeatmapFallback />;
  }

  return <LandingWardHeatmap />;
}
