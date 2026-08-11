'use client';

import { Printer } from 'lucide-react';

export function PrintButton({ label = 'Bileti yazdır' }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-sm btn-secondary">
      <Printer className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}
