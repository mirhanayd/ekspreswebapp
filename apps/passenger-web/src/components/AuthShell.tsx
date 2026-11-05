import { BrandMark } from './BrandLogo';
import { BackButton } from '@/components/nav/BackButton';

/** Sign in / sign up: a dark header carrying the title, with the form card overlapping it. */
export function AuthShell({
  eyebrow,
  title,
  description,
  highlights,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] pb-8">
      <header className="relative overflow-hidden rounded-b-[34px] bg-sk-dark px-5 pb-[120px] pt-4">
        <div className="relative flex h-11 items-center justify-between">
          <BackButton fallback="/" className="!border-0 !bg-white/[0.08] !text-white" />
          <BrandMark tone="light" className="w-[110px]" priority />
          <span className="h-11 w-11" aria-hidden />
        </div>
        <p className="eyebrow relative m-0 mt-7 !text-sk-mute">{eyebrow}</p>
        <h1 className="relative m-0 mt-1.5 text-[30px] font-extrabold leading-[1.08] tracking-[-0.02em] text-white [font-stretch:110%]">
          {title}
        </h1>
        <p className="relative m-0 mt-2 max-w-[320px] text-[15px] leading-snug text-sk-mute">
          {description}
        </p>
      </header>

      <div
        className="relative -mt-[88px] mx-4 rounded-[28px] bg-white p-5"
        style={{ boxShadow: '0 24px 48px -16px rgba(22,23,27,.32), 0 2px 6px rgba(22,23,27,.06)' }}
      >
        {children}
      </div>

      <ul className="m-0 mx-5 mt-5 flex list-none flex-col gap-2 p-0">
        {highlights.map((item) => (
          <li key={item} className="flex items-center gap-2.5 text-[13px] text-sk-ink2">
            <span aria-hidden className="h-1.5 w-1.5 flex-none rounded-full bg-sk-brand" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
