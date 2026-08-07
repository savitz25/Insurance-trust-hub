import Link from 'next/link';
import { brandAsset, BRAND, BRAND_LOGO } from '@/lib/brand';

/**
 * Header logo — official transparent ITH lockup (Phase 1).
 * No background plate; multi-color mark + wordmark.
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
    <span className="hub-logo-slot relative block shrink-0 bg-transparent">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        srcSet={`${src} 1x, ${src2x} 2x`}
        alt={BRAND.name}
        width={720}
        height={209}
        className="h-full w-full object-contain object-left bg-transparent"
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
      className="group flex shrink-0 items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] focus-visible:ring-offset-2"
      aria-label={`${BRAND.name} — home`}
    >
      {inner}
    </Link>
  );
}

/** Footer logo on navy — lightened wordmark variant (no CSS invert) */
export function BrandLogoStacked({ className = '' }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={brandAsset(BRAND_LOGO.footer)}
      alt={BRAND.name}
      width={720}
      height={209}
      className={`h-12 w-auto max-w-[200px] object-contain object-left bg-transparent ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
}
