import Image from 'next/image';
import Link from 'next/link';

/**
 * Company wordmark. The asset is trimmed and knocked out to alpha, so it sits
 * directly on any surface; `tone="light"` adds a soft halo for dark chrome.
 */
export function BrandMark({
  className = 'w-32',
  tone = 'dark',
  priority = false,
}: {
  className?: string;
  tone?: 'dark' | 'light';
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/logo.png"
      alt="Siirt Kurtalan Ekspres"
      width={900}
      height={244}
      priority={priority}
      className={`h-auto ${className} ${
        tone === 'light' ? 'drop-shadow-[0_1px_2px_rgba(255,255,255,0.45)]' : ''
      }`}
    />
  );
}

export function BrandLink({
  href = '/',
  className = 'w-32',
  tone = 'dark',
}: {
  href?: string;
  className?: string;
  tone?: 'dark' | 'light';
}) {
  return (
    <Link href={href} aria-label="Siirt Kurtalan Ekspres ana sayfa" className="inline-flex">
      <BrandMark className={className} tone={tone} priority />
    </Link>
  );
}
