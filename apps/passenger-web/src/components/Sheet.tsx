'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Bottom sheet used by the journey editor's pickers. Rises from the bottom edge
 * on phones and centres as a dialog from `sm` up, in the same rounded-surface
 * language as the rest of the app.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Rendered into the body so the page canvas — which is its own stacking
  // context — cannot trap the overlay under the floating tab bar.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-ink-950/45 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative max-h-[85dvh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white p-5 pb-[calc(1.25rem+var(--safe-bottom))] shadow-panel outline-none sm:max-w-md sm:rounded-[1.75rem] sm:pb-5"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="title-md">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="icon-btn icon-btn-sm bg-ink-900/[0.06] text-ink-700 hover:bg-ink-900/10"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
