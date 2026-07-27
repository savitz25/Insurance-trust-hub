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
  /** Cancel / stay on page */
  onClose: () => void;
  onConfirmed?: (target: ExternalRedirectTarget) => void;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Consent modal before leaving InsuranceTrustHub for official state license sites.
 * Requires checkbox agreement; Cancel / Escape / backdrop keep the user on-site.
 */
export function ExternalRedirectConsent({ open, target, onClose, onConfirmed }: Props) {
  const [agreed, setAgreed] = useState(false);
  const titleId = useId();
  const descId = useId();
  const checkboxId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      setAgreed(false);
      return;
    }

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const focusFirst = () => {
      const nodes = panel?.querySelectorAll<HTMLElement>(FOCUSABLE);
      const first = nodes?.[0];
      first?.focus();
    };
    const t = window.setTimeout(focusFirst, 0);

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !target) return null;

  const stateLabel = target.stateName?.trim() || 'your selected state';

  function stay() {
    onClose();
  }

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
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
        aria-label="Stay on InsuranceTrustHub"
        onClick={stay}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn(
          'relative z-[101] w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl',
          'max-h-[min(90vh,640px)] overflow-y-auto sm:p-6'
        )}
      >
        <button
          type="button"
          onClick={stay}
          className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          aria-label="Stay on InsuranceTrustHub"
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
            <div id={descId} className="mt-2 space-y-3 text-sm leading-relaxed text-slate-600">
              <p>
                You are about to open the official state insurance license verification website for{' '}
                <strong className="font-semibold text-slate-800">{stateLabel}</strong>.
              </p>
              {target.destinationLabel ? (
                <p>
                  Destination:{' '}
                  <span className="font-medium text-slate-800">{target.destinationLabel}</span>
                </p>
              ) : null}
              <p>
                InsuranceTrustHub does not operate that website and cannot control its content,
                availability, or results. Final license status should be confirmed on the official
                state source.
              </p>
            </div>
          </div>
        </div>

        <label
          htmlFor={checkboxId}
          className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm text-slate-800"
        >
          <input
            id={checkboxId}
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span>
            I understand I am leaving InsuranceTrustHub to use the official state verification site
          </span>
        </label>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={stay} className="min-h-[44px]">
            Stay on InsuranceTrustHub
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
