'use client';

import { cn } from '@/lib/utils';

/** Official multicolor Google “G” mark (inline SVG — no external asset). */
function GoogleGMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={18}
      height={18}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/** Official Facebook “f” glyph (white on brand blue). */
function FacebookFMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={18}
      height={18}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.026 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.026 24 18.1 24 12.073z"
      />
    </svg>
  );
}

const baseButtonClass =
  'inline-flex h-11 w-full items-center justify-center gap-3 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

type SocialButtonProps = {
  href: string;
  disabled?: boolean;
};

/**
 * Official-style Google button — white surface, multicolor G, OAuth via insurance auth route.
 */
export function InsuranceGoogleSignInButton({ href, disabled }: SocialButtonProps) {
  return (
    <a
      href={href}
      aria-label="Continue with Google"
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        baseButtonClass,
        'border border-[#dadce0] bg-white text-[#3c4043] hover:bg-[#f8f9fa]',
        'focus-visible:ring-[#4285F4]/50',
        disabled && 'pointer-events-none opacity-50'
      )}
      onClick={(e) => {
        if (disabled) e.preventDefault();
      }}
    >
      <GoogleGMark className="h-[18px] w-[18px] shrink-0" />
      <span>Continue with Google</span>
    </a>
  );
}

/**
 * Official-style Facebook button — Meta blue + white f mark, OAuth via insurance auth route.
 */
export function InsuranceFacebookSignInButton({ href, disabled }: SocialButtonProps) {
  return (
    <a
      href={href}
      aria-label="Continue with Facebook"
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        baseButtonClass,
        'border border-[#1877F2] bg-[#1877F2] text-white hover:bg-[#166fe5]',
        'focus-visible:ring-[#1877F2]/50',
        disabled && 'pointer-events-none opacity-50'
      )}
      onClick={(e) => {
        if (disabled) e.preventDefault();
      }}
    >
      <FacebookFMark className="h-[18px] w-[18px] shrink-0 text-white" />
      <span>Continue with Facebook</span>
    </a>
  );
}
