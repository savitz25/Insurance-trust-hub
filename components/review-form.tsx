'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, Star } from 'lucide-react';
import { reviewFormSchema, type ReviewFormValues } from '@/lib/validations/forms';
import { submitReview } from '@/lib/actions/reviews';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ReviewFormProps {
  providerSlug: string;
  providerName: string;
}

export function ReviewForm({ providerSlug, providerName }: ReviewFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [hoverRating, setHoverRating] = useState(0);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      providerSlug,
      rating: 0,
      verifiedCustomer: false,
      website: '',
    },
  });

  const rating = watch('rating');

  async function onSubmit(data: ReviewFormValues) {
    setServerError(null);
    const res = await submitReview(data);
    if (!res.success) {
      setServerError(res.error ?? 'Something went wrong.');
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card className="border-trust/30 bg-trust/5 p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-trust mx-auto mb-3" />
        <h2 className="text-xl font-semibold">Review submitted</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          Thank you for sharing your experience with {providerName}. Reviews are moderated
          before publication.
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register('providerSlug')} />

      <div>
        <Label>
          Your rating <span className="text-destructive">*</span>
        </Label>
        <Controller
          name="rating"
          control={control}
          render={({ field }) => (
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => field.onChange(star)}
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    className={cn(
                      'h-7 w-7 transition-colors',
                      (hoverRating || rating) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/30'
                    )}
                  />
                </button>
              ))}
            </div>
          )}
        />
        {errors.rating && (
          <p className="mt-1 text-xs text-destructive">{errors.rating.message}</p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="review-author">
            Your name <span className="text-destructive">*</span>
          </Label>
          <Input id="review-author" className="mt-1.5" {...register('author')} />
          {errors.author && (
            <p className="mt-1 text-xs text-destructive">{errors.author.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="review-email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="review-email"
            type="email"
            className="mt-1.5"
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="review-title">
          Review title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="review-title"
          className="mt-1.5"
          placeholder="Summarize your experience"
          {...register('title')}
        />
        {errors.title && (
          <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="review-content">
          Your review <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="review-content"
          rows={5}
          className="mt-1.5"
          placeholder="What did you like or dislike? How was claims service?"
          {...register('content')}
        />
        {errors.content && (
          <p className="mt-1 text-xs text-destructive">{errors.content.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Controller
          name="verifiedCustomer"
          control={control}
          render={({ field }) => (
            <Checkbox
              id="verified-customer"
              checked={Boolean(field.value)}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
          )}
        />
        <Label htmlFor="verified-customer" className="text-sm font-normal cursor-pointer">
          I am a current or former customer of this agency
        </Label>
      </div>

      <input type="hidden" {...register('website')} />

      {serverError && (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting} className="min-h-[48px] gap-2">
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
          </>
        ) : (
          'Submit review'
        )}
      </Button>
    </form>
  );
}