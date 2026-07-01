import { Search, Scale, Handshake } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    icon: Search,
    title: 'Search Your ZIP',
    description:
      'Enter your ZIP code to auto-detect your county and MSA. See ranked local agents with health insurance specialists highlighted for ACA, Medicare, and employer plans.',
  },
  {
    step: '02',
    icon: Scale,
    title: 'Compare & Verify',
    description:
      'Review Trust Scores, state DOI licensing, NAIC verification, BBB ratings, and attributed reviews. We analyze public records — never sponsored placements.',
  },
  {
    step: '03',
    icon: Handshake,
    title: 'Connect Securely',
    description:
      'Use our calculators to understand your numbers, then connect with independent agents who specialize in your coverage needs. Always verify licensing before engaging.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 md:py-20 border-t bg-secondary/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-[0.2em] text-trust uppercase mb-2">How It Works</p>
          <h2 className="section-heading">Your Path to the Right Agent</h2>
          <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
            Three steps to discover honest local insurance experts with transparent, data-driven listings.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {STEPS.map((item) => (
            <div key={item.step} className="rounded-2xl border bg-card p-6 shadow-trust text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <span className="text-2xl font-bold text-primary/30">{item.step}</span>
                <item.icon className="h-6 w-6 text-trust" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}