'use client';

import { ChevronLeft } from 'lucide-react';
import { useNav } from './NavProvider';

export function BackButton({
  fallback = '/',
  label = 'Geri',
  className = '',
}: {
  fallback?: string;
  label?: string;
  className?: string;
}) {
  const nav = useNav();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => nav.back(fallback)}
      className={`round-btn ${className}`}
    >
      <ChevronLeft size={20} strokeWidth={2.4} aria-hidden />
    </button>
  );
}
