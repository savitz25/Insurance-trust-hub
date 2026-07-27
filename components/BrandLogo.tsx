import Link from 'next/link';
import { brandAsset, BRAND_LOGO } from '@/lib/brand';

/**
 * Header logo: full horizontal InsuranceTrustHub lockup (transparent PNG).
 * Logo image includes wordmark — no separate HTML brand text.
 */
export function BrandLogo({
  href = '/',
  priority = false,
}: {
  href?: string;
  priority?: boolean;
}) {
  const load = priority ? 'eager' : 'lazy';
  const src = brandAsset(BRAND_LOGO.header);
  const src2x = brandAsset(BRAND_LOGO.header2x);

  const inner = (
    <span className="flex min-w-0 max-w-[min(280px,68vw)] items-center sm:max-w-[300px] md:max-w-[340px]">
      <img
        src={src}
        srcSet={`${src} 480w, ${src2x} 960w`}
        sizes="(max-width: 640px) 180px, (max-width: 768px) 220px, 260px"
        alt="Insurance Trust Hub"
        width={480}
        height={151}
        className="h-10 w-auto max-h-11 object-contain object-left sm:h-11 md:h-12"
        loading={load}
        decoding="async"
        {...(priority ? { fetchPriority: 'high' as const } : {})}
      />
    </span>
  );

  if (!href) {
    return <div className="flex items-center">{inner}</div>;
  }

  return (
    <Link
      href={href}
      className="group flex shrink-0 items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-trust focus-visible:ring-offset-2"
      aria-label="Insurance Trust Hub — home"
    >
      {inner}
    </Link>
  );
}

/** Footer / compact logo (same horizontal lockup, smaller footprint). */
export function BrandLogoStacked({ className = '' }: { className?: string }) {
  const src = brandAsset(BRAND_LOGO.fullSm);
  const srcLg = brandAsset(BRAND_LOGO.full);

  return (
    <img
      src={src}
      srcSet={`${src} 600w, ${srcLg} 1200w`}
      sizes="(max-width: 640px) 140px, 180px"
      alt="Insurance Trust Hub"
      width={600}
      height={150}
      className={`h-auto w-[140px] object-contain object-left py-1 sm:w-[180px] ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
}
