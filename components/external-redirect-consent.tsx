'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ExternalLink, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ExternalRedirectTarget = {
  url: string;
  /** e.g. "Florida Department of Financial Services" */
  destinationLabel: string;
  /** e.g. "Florida" */
  stateName?: string;
};

type Props = {
  open: boolean;
  target: ExternalRedirectTarget | null;
  onClose: () => void;
  /** Called after user agrees and we open the external URL */
  onConfirmed?: (target: ExternalRedirectTarget) => void;
};

/**
 * Modal shown before any navigation to an external official license lookup.
 * Requires explicit checkbox agreement — no silent redirects.
 */
export function ExternalRedirectConsent({ open, target, onClose, onConfirmed }: Props) {
  const [agreed, setAgreed] = useState(false);
  const titleId = useId();
  const descId = useId();
  const checkboxId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setAgreed(false);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('button, input, a')?.focus();
    }, 0);
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !target) return null;

  function confirm() {
    if (!agreed || !target) return;
    window.open(target.url, '_blank', 'noopener,noreferrer');
    onConfirmed?.(target);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        aria-label="Dismiss dialog"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn(
          'relative z-[101] w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl',
          'sm:p-6'
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex gap-3 pr-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
            <ShieldAlert className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-slate-900">
              You are leaving InsuranceTrustHub
            </h2>
            <p id={descId} className="mt-2 text-sm leading-relaxed text-slate-600">
              Next you will open the{' '}
              <strong className="font-semibold text-slate-800">
                official{target.stateName ? ` ${target.stateName}` : ''} state license verification
                site
              </strong>
              {target.destinationLabel ? (
                <>
                  {' '}
                  operated by <span className="font-medium text-slate-800">{target.destinationLabel}</span>
                </>
              ) : null}
              . InsuranceTrustHub does not control that website, its search results, or license
              records. Final license status comes from the state — not from us.
            </p>
          </div>
        </div>

        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
          <li>We do not live-verify all 50-state producer licenses in-house.</li>
          <li>We never invent or cache official license status for you.</li>
          <li>Use the state site to confirm active status before buying coverage.</li>
        </ul>

        <label
          htmlFor={checkboxId}
          className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm text-slate-800"
        >
          <input
            id={checkboxId}
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span>
            I understand I am leaving InsuranceTrustHub and that the official state site is the
            authority for license status.
          </span>
        </label>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} className="min-h-[44px]">
            Stay on this site
          </Button>
          <Button
            type="button"
            onClick={confirm}
            disabled={!agreed}
            className="min-h-[44px] gap-2"
          >
            Continue to official state site
            <ExternalLink className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
