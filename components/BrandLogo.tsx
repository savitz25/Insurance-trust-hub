import Link from 'next/link';

/**
 * Header logo: crisp emblem PNG + HTML wordmark (true transparency, no composite artifacts).
 * Matches LenderTrustHub.com logo treatment.
 */
export function BrandLogo({
  href = '/',
  priority = false,
}: {
  href?: string;
  priority?: boolean;
}) {
  const load = priority ? 'eager' : 'lazy';

  const inner = (
    <span className="flex min-w-0 max-w-[min(340px,72vw)] items-center gap-2.5 sm:gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center sm:h-12 sm:w-12 md:h-[52px] md:w-[52px]">
        <img
          src="/brand/insurance-trust-hub-icon-192.png"
          srcSet="/brand/insurance-trust-hub-icon-192.png 192w, /brand/insurance-trust-hub-icon.png 512w"
          sizes="(max-width: 768px) 44px, 52px"
          alt=""
          aria-hidden="true"
          width={192}
          height={192}
          className="h-full w-full object-contain object-center"
          loading={load}
          decoding="async"
        />
      </span>
      <span className="flex min-w-0 flex-col justify-center gap-0.5 py-0.5">
        <span className="truncate text-[15px] font-bold leading-tight tracking-tight text-[#0A2540] transition-colors group-hover:text-trust sm:text-base md:text-[17px]">
          Insurance Trust Hub
        </span>
        <span className="text-[7px] font-semibold uppercase leading-tight tracking-[0.14em] text-muted-foreground sm:text-[8px] md:text-[9px]">
          Verified Insurance Directories
        </span>
      </span>
    </span>
  );

  if (!href) {
    return <div className="flex items-center">{inner}</div>;
  }

  return (
    <Link
      href={href}
      className="group flex shrink-0 items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-trust focus-visible:ring-offset-2 rounded-lg"
      aria-label="Insurance Trust Hub — home"
    >
      {inner}
    </Link>
  );
}

/** Stacked logo for footer */
export function BrandLogoStacked({ className = '' }: { className?: string }) {
  return (
    <img
      src="/brand/insurance-trust-hub-logo-stacked-sm.png"
      srcSet="/brand/insurance-trust-hub-logo-stacked-sm.png 600w, /brand/insurance-trust-hub-logo-stacked.png 1200w"
      sizes="(max-width: 640px) 110px, 140px"
      alt="Insurance Trust Hub"
      width={600}
      height={611}
      className={`h-auto w-[100px] object-contain object-left py-1 sm:w-[130px] ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
}