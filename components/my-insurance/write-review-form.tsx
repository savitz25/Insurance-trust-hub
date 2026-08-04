'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import { submitProviderReviewAction } from '@/actions/my-insurance';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const COVERAGE_OPTIONS = [
  '',
  'Health',
  'Medicare',
  'Auto',
  'Home',
  'Life',
  'Commercial',
  'Other',
] as const;

type Props = {
  providerSlug: string;
  providerName: string;
};

export function WriteReviewForm({ providerSlug, providerName }: Props) {
  const mi = useMyInsuranceOptional();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [coverageType, setCoverageType] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mi?.user) {
      mi?.openAuth({
        context: 'general',
        redirectPath: `/providers/${providerSlug}`,
      });
      toast.message('Sign in to leave a review');
      return;
    }
    if (rating < 1) {
      toast.error('Choose a star rating');
      return;
    }
    setBusy(true);
    try {
      const res = await submitProviderReviewAction({
        providerSlug,
        rating,
        title: title.trim() || undefined,
        body,
        coverageType: coverageType || undefined,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDone(true);
      toast.success('Review submitted for moderation');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-teal-600" />
        <h3 className="mt-3 text-lg font-semibold text-slate-900">Thank you</h3>
        <p className="mt-2 text-sm text-slate-600">
          Your review of {providerName} is <strong>pending moderation</strong> before public display.
          You can find it under My Reviews in Insurance HQ.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Write a review</h3>
        <p className="mt-1 text-sm text-slate-600">
          Share a firsthand experience. Reviews are moderated and do not imply official DOI/CMS
          endorsement.
        </p>
      </div>

      <div>
        <Label>
          Rating <span className="text-rose-600">*</span>
        </Label>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(star)}
              aria-label={`Rate ${star} stars`}
            >
              <Star
                className={cn(
                  'h-7 w-7 transition-colors',
                  (hover || rating) >= star
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-300'
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="mi-review-title">Title (optional)</Label>
        <Input
          id="mi-review-title"
          className="mt-1.5"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Short summary"
        />
      </div>

      <div>
        <Label htmlFor="mi-review-body">
          Your review <span className="text-rose-600">*</span>
        </Label>
        <textarea
          id="mi-review-body"
          required
          minLength={20}
          maxLength={3000}
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="What went well? What could improve? (min 20 characters)"
        />
      </div>

      <div>
        <Label htmlFor="mi-review-coverage">Coverage type (optional)</Label>
        <select
          id="mi-review-coverage"
          value={coverageType}
          onChange={(e) => setCoverageType(e.target.value)}
          className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {COVERAGE_OPTIONS.map((o) => (
            <option key={o || 'none'} value={o}>
              {o || 'Select...'}
            </option>
          ))}
        </select>
      </div>

      {!mi?.user && (
        <p className="text-xs text-slate-500">
          You will be asked to sign in to My Insurance before submit.
        </p>
      )}

      <Button
        type="submit"
        disabled={busy}
        className="h-11 w-full gap-2 bg-teal-600 hover:bg-teal-700 sm:w-auto"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? 'Submitting...' : 'Submit review'}
      </Button>
    </form>
  );
}
