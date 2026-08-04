import { Search, Scale, BookOpen } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    icon: Search,
    title: 'Find licensed agents in your market',
    description:
      'Search by ZIP or browse health hubs. Listings surface state-licensed agencies and agents for research — not a ranked marketplace of paid placements.',
  },
  {
    step: '02',
    icon: Scale,
    title: 'Re-check DOI and NAIC records',
    description:
      'Use license numbers and our license-verification pathways to confirm Active status and lines of authority on official state DOI sources before you share personal data.',
  },
  {
    step: '03',
    icon: BookOpen,
    title: 'Use educational tools, then decide',
    description:
      'ACA subsidy estimates, Medicare research guides, and cost planners are educational only — not enrollment and not binding coverage. You choose the agent and the policy.',
  },
];

export function HowItWorks() {
  return (
    <section className="border-t bg-secondary/20 py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-trust">
            How research works here
          </p>
          <h2 className="section-heading">Name what you protect — then verify licensing</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            Insurance Trust Hub is a research directory for DOI-licensed options. We do not sell
            policies, free quotes, or rank agents for pay.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          {STEPS.map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border bg-card p-6 text-center shadow-trust md:text-left"
            >
              <div className="mb-4 flex items-center justify-center gap-3 md:justify-start">
                <span className="text-2xl font-bold text-primary/30">{item.step}</span>
                <item.icon className="h-6 w-6 text-trust" aria-hidden="true" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
