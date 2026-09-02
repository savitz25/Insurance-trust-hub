export function Trace({
  source,
  sourceDate,
  denominator,
  calculation,
  grain,
  coverage,
  caveat,
}: {
  source: string;
  sourceDate: string;
  denominator: string;
  calculation: string;
  grain: string;
  coverage: string;
  caveat: string;
}) {
  return (
    <details className="mt-2 text-xs text-slate-600">
      <summary className="cursor-pointer font-medium text-[#0284C7] underline-offset-2 hover:underline">
        Trace this number
      </summary>
      <dl className="mt-2 grid gap-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div>
          <dt className="font-semibold text-slate-700">Source</dt>
          <dd>{source}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Source date</dt>
          <dd>{sourceDate}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Denominator</dt>
          <dd>{denominator}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Calculation</dt>
          <dd>{calculation}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Reporting grain</dt>
          <dd>{grain}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Coverage</dt>
          <dd>{coverage}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Caveat</dt>
          <dd>{caveat}</dd>
        </div>
      </dl>
    </details>
  );
}
