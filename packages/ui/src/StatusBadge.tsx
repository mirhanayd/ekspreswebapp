import * as React from 'react';
import { cn } from './lib/utils';

export type StatusTone = 'ok' | 'degraded' | 'maintenance';

export interface StatusBadgeProps {
  status: StatusTone;
  className?: string;
}

const toneClass: Record<StatusTone, string> = {
  ok: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  degraded: 'bg-ember-50 text-ember-800 ring-ember-200',
  maintenance: 'bg-brand-50 text-brand-800 ring-brand-200',
};

const toneLabel: Record<StatusTone, string> = {
  ok: 'Çalışıyor',
  degraded: 'Kısmi',
  maintenance: 'Bakımda',
};

/** Shared operational status pill using the Siirt Kurtalan Ekspres tokens. */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide ring-1 ring-inset',
        toneClass[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {toneLabel[status]}
    </span>
  );
}
