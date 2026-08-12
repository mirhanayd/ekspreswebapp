import type { ReactNode } from 'react';

type Base = { children?: ReactNode; className?: string };

export const Card = ({ children, className = '' }: Base) => (
  <section className={`surface ${className}`}>{children}</section>
);

export const CardHeader = ({ children, className = '' }: Base) => (
  <div className={`flex flex-col gap-1 border-b border-ink-100 px-4 py-3.5 sm:px-5 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }: Base) => (
  <h2 className={`font-display text-base font-bold tracking-tight text-ink-900 ${className}`}>
    {children}
  </h2>
);

export const CardDescription = ({ children, className = '' }: Base) => (
  <p className={`text-xs text-ink-500 ${className}`}>{children}</p>
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
        {description ? <p className="mt-1 text-sm text-ink-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-10 text-center text-sm text-ink-500">
        {children}
      </td>
    </tr>
  );
}
