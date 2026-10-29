import type { ReactNode } from 'react';
import { statusMeta } from '@/lib/trip-status';

type Base = { children?: ReactNode; className?: string };

export function StatusChip({ status, className = '' }: { status: string; className?: string }) {
  const meta = statusMeta(status);
  return (
    <span
      className={`chip-status ${className}`}
      style={{ backgroundColor: meta.bg, color: meta.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {meta.label}
    </span>
  );
}

export function Avatar({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#EEF0F3] text-xs font-semibold text-[#344054] ${className}`}
      aria-hidden
    >
      {name}
    </span>
  );
}

export function OccupancyBar({ sold, total }: { sold: number; total: number }) {
  const percent = total ? Math.round((sold / total) * 100) : 0;
  return (
    <div className="min-w-24">
      <p className="text-xs text-adm-muted">
        <span className="font-medium text-adm-text">
          {sold}/{total}
        </span>{' '}
        · %{percent}
      </p>
      <span className="ops-meter mt-1.5" aria-hidden>
        <span className="ops-meter-fill" style={{ width: `${Math.min(100, percent)}%` }} />
      </span>
    </div>
  );
}

export const Card = ({ children, className = '' }: Base) => (
  <section className={`surface ${className}`}>{children}</section>
);

export const CardHeader = ({ children, className = '' }: Base) => (
  <div className={`flex flex-col gap-1 border-b border-adm-line px-4 py-3.5 sm:px-5 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }: Base) => (
  <h2 className={`text-base font-semibold text-adm-text ${className}`}>
    {children}
  </h2>
);

export const CardDescription = ({ children, className = '' }: Base) => (
  <p className={`text-sm text-adm-muted ${className}`}>{children}</p>
);

export const CardContent = ({ children, className = '' }: Base) => (
  <div className={`px-4 py-4 sm:px-5 ${className}`}>{children}</div>
);

export type BadgeTone = 'brand' | 'live' | 'warn' | 'neutral';

const badgeTone: Record<BadgeTone, string> = {
  brand: 'chip-brand',
  live: 'chip-live',
  warn: 'chip-warn',
  neutral: 'chip-neutral',
};

export const Badge = ({
  children,
  tone = 'neutral',
  className = '',
}: Base & { tone?: BadgeTone }) => (
  <span className={`chip-status ${badgeTone[tone]} ${className}`}>{children}</span>
);

/** Horizontally scrollable table wrapper; tables stay readable on tablets. */
export const Table = ({ children, className = '' }: Base) => (
  <div className="overflow-x-auto">
    <table className={`data-grid ${className}`}>{children}</table>
  </div>
);

export const TableHeader = ({ children }: Base) => <thead>{children}</thead>;
export const TableBody = ({ children }: Base) => <tbody>{children}</tbody>;
export const TableRow = ({ children, className = '' }: Base) => (
  <tr className={className}>{children}</tr>
);
export const TableHead = ({ children, className = '' }: Base) => (
  <th className={className} scope="col">
    {children}
  </th>
);
export const TableCell = ({ children, className = '', colSpan }: Base & { colSpan?: number }) => (
  <td className={className} colSpan={colSpan}>
    {children}
  </td>
);

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="page-eyebrow">{eyebrow}</p>
        <h1 className="page-title mt-1">{title}</h1>
        {description ? <p className="mt-1 text-sm text-adm-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-adm-muted">
        {children}
      </td>
    </tr>
  );
}
