import Link from 'next/link';
import { InsuranceNetworkMark } from '@/components/insurance-network-mark';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';

/**
 * Header: canonical TrustHub mark + HTML wordmark in the 36/33/30 slot.
 * Shield iconography is not the network logo.
 */
export function BrandLogo({
  href = '/',
  className,
  inverted = false,
}: {
  href?: string;
  className?: string;
  inverted?: boolean;
}) {
  const inner = (
    <>
      <InsuranceNetworkMark className="th-logo-mark" />
      <span className="th-logo-wordmark">
        <span className="th-logo-name">INSURANCE</span>
        <span className="th-logo-hub">TRUST HUB</span>
      </span>
    </>
  );

  if (!href) {
    return (
      <div className={cn('th-logo-lockup', inverted && 'th-logo-lockup-on-dark', className)}>
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        'group th-logo-lockup flex shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--th-accent)] focus-visible:ring-offset-2',
        inverted && 'th-logo-lockup-on-dark',
        className,
      )}
      aria-label={`${BRAND.name} home`}
    >
      {inner}
    </Link>
  );
}

export function BrandLogoStacked({ className = '' }: { className?: string }) {
  return <BrandLogo href="/" inverted className={className} />;
}
