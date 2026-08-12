'use client';

import { Printer } from 'lucide-react';

export function PrintButton({ label = 'Bileti yazdır' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      aria-label={label}
      title={label}
      className="icon-btn icon-btn-white"
    >
      <Printer className="h-5 w-5" aria-hidden />
    </button>
  );
}
