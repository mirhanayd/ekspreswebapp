import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * The top row every reference screen owns in place of a site header: a 56px
 * circular white control on the left, an optional centred title, and a matching
 * slot on the right so the title stays optically centred.
 */
export function ScreenHeader({
  backHref,
  backLabel = 'Geri dön',
  title,
  action,
}: {
  backHref: string;
  backLabel?: string;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="top-row">
      <Link href={backHref} aria-label={backLabel} className="icon-btn icon-btn-white">
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </Link>

      {title ? (
        <p className="min-w-0 truncate px-2 font-display text-[1.0625rem] font-bold text-ink-900">
          {title}
        </p>
      ) : null}

      {action ?? <span className="h-14 w-14 shrink-0" aria-hidden />}
    </div>
  );
}
