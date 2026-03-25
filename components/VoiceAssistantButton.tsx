'use client';

import { Mic } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function VoiceAssistantButton({
  onClick,
  disabled = false,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn('h-11 rounded-full bg-[#0F766E] px-5 text-white shadow-[0_10px_30px_rgba(15,118,110,0.28)] hover:bg-[#115E59]', className)}
    >
      <Mic className="h-4 w-4" />
      <span>Speak Complaint</span>
    </Button>
  );
}
