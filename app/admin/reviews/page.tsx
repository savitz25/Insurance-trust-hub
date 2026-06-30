import { format } from 'date-fns';
import { getAdminReviews } from '@/lib/admin/queries';
import { ReviewActions } from '@/components/admin/review-actions';
import { StarRating } from '@/components/star-rating';
import { Badge } from '@/components/ui/badge';

export default async function AdminReviewsPage() {
  const reviews = await getAdminReviews('pending');

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Review moderation</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {reviews.length} review{reviews.length !== 1 ? 's' : ''} pending approval
      </p>

      <div className="mt-8 space-y-4">
        {reviews.length === 0 ? (
          <p className="text-muted-foreground text-sm rounded-xl border bg-muted/20 p-8 text-center">
            No pending reviews. Check back later.
          </p>
        ) : (
          reviews.map((review) => (
            <article key={review.id} className="rounded-xl border p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{review.providerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {review.author} · {format(new Date(review.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StarRating rating={review.rating} size="sm" showNumber={false} />
                  <Badge variant="warning">Pending</Badge>
                </div>
              </div>
              {review.title && <h3 className="font-medium">{review.title}</h3>}
              <p className="text-sm text-muted-foreground leading-relaxed">{review.content}</p>
              <ReviewActions reviewId={review.id} />
            </article>
          ))
        )}
      </div>
    </div>
  );
}