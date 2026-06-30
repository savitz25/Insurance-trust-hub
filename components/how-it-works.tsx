import { ClipboardList, MessageSquare, Search, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    icon: Search,
    title: 'Search your area',
    description:
      'Filter licensed agencies by state, insurance type, and specialty. Read verified reviews and compare ratings.',
  },
  {
    icon: ClipboardList,
    title: 'Review agency profiles',
    description:
      'See carriers represented, years in business, license details, and coverage specialties before you reach out.',
  },
  {
    icon: MessageSquare,
    title: 'Request free quotes',
    description:
      'Contact agencies directly or submit a quote request. Independent agents shop multiple carriers for you.',
  },
  {
    icon: ShieldCheck,
    title: 'Verify & decide',
    description:
      'Confirm licensing with your state insurance department, compare coverage — not just price — and choose with confidence.',
  },
] as const;

interface HowItWorksProps {
  className?: string;
}

export function HowItWorks({ className }: HowItWorksProps) {
  return (
    <section className={cn('py-16 md:py-20', className)} aria-labelledby="how-it-works-heading">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 id="how-it-works-heading" className="section-heading">
            How Insurance Trust Hub works
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            An independent research directory — we help you find licensed agents, not sell policies ourselves.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {STEPS.map((step, index) => (
            <div key={step.title} className="stat-card text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="text-xs font-bold text-muted-foreground/60 tracking-widest">
                  STEP {index + 1}
                </span>
              </div>
              <h3 className="font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}