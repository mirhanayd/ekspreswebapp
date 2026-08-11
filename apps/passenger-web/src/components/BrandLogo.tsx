import Image from 'next/image';
import Link from 'next/link';

/**
 * The company wordmark ships as a raster asset with a solid white background,
 * so it is always presented on a white "plate". On dark chrome that reads as a
 * deliberate brand badge; on light surfaces the plate disappears into the card.
 */
export function BrandMark({ className = '', size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  const dimensions = size === 'sm' ? { width: 96, height: 38 } : { width: 132, height: 53 };
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-black/5 ${className}`}
    >
      <Image
        src="/brand/logo.png"
        alt="Siirt Kurtalan Ekspres"
        priority
        {...dimensions}
        className="h-auto w-full max-w-full"
      />
    </span>
  );
}

export function BrandLink({
  href = '/',
  className = '',
  size = 'md',
}: {
  href?: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <Link
      href={href}
      aria-label="Siirt Kurtalan Ekspres ana sayfa"
      className={`inline-flex items-center gap-3 rounded-xl ${className}`}
    >
      <BrandMark size={size} className={size === 'sm' ? 'w-24' : 'w-28 sm:w-32'} />
    </Link>
  );
}
