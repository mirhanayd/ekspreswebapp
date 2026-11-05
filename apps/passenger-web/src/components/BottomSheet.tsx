'use client';

import { useEffect, useRef } from 'react';

/**
 * Bottom sheet that rises with the nav easing. It stays mounted so the close
 * motion can play; `visibility` takes it out of the tab order while closed.
 */
export function BottomSheet({
  open,
  onClose,
  label,
  height,
  children,
  className = '',
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  /** Fixed sheet height in px; omitted, the sheet sizes to its content. */
  height?: number;
  children: React.ReactNode;
  className?: string;
  dismissible?: boolean;
}) {
  const panel = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      panel.current?.querySelector<HTMLElement>('[data-autofocus], button, input')?.focus();
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      returnFocus.current?.focus?.();
    };
  }, [open, onClose, dismissible]);

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label={`${label} kapat`}
        data-open={open}
        onClick={dismissible ? onClose : undefined}
        className="scrim"
      />
      <section
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-hidden={!open}
        data-open={open}
        className={`sheet fixed-col overflow-hidden ${className}`}
        style={{ height, paddingBottom: 'var(--safe-bottom)' }}
      >
        <span aria-hidden className="sheet-grip" />
        {children}
      </section>
    </>
  );
}
