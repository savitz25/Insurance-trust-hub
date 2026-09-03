'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  TX_COMPANY_LIMIT,
  filterTxCompanies,
  type TxCompanyFile,
  type TxCompanyRow,
} from '@/lib/texas-intelligence/search';

function ResultRow({ row }: { row: TxCompanyRow }) {
  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <p className="font-semibold text-[#0A2540]">{row.name || 'Unnamed company row'}</p>
      <p className="mt-1 text-sm text-slate-700">NAIC {row.naic}</p>
      <p className="mt-1 text-sm text-slate-700">
        Active agency appointments in the acquired graph:{' '}
        {row.agency_appointments.toLocaleString('en-US')}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        NAIC on an appointment is a Texas source relationship. It is not by itself the complete TDI
        authorized-company universe. Agency appointment count is not quality. Complaints and rate
        filings attach only on exact NAIC, not name.
      </p>
    </article>
  );
}

export function TexasCompanySearch() {
  const [file, setFile] = useState<TxCompanyFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [naic, setNaic] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/texas-tdi-appointment-companies.json')
      .then((res) => {
        if (!res.ok) throw new Error(`inventory HTTP ${res.status}`);
        return res.json() as Promise<TxCompanyFile>;
      })
      .then((data) => {
        if (!cancelled) setFile(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'inventory load failed');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    if (!file || !submitted) return [];
    return filterTxCompanies(file.rows, { q, naic });
  }, [file, submitted, q, naic]);

  return (
    <section className="mt-10" aria-labelledby="tx-company-search">
      <h2 id="tx-company-search" className="text-lg font-semibold text-[#0A2540]">
        Company research
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Companies that appear on official active TDI agency appointments. Search by NAIC or name.
        Capped at {TX_COMPANY_LIMIT} rows. Not a ranking.
      </p>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        <label className="text-sm">
          Company name / NAIC
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Exact NAIC
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={naic}
            onChange={(e) => setNaic(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-[#0A2540] px-4 py-2 text-sm font-medium text-white sm:col-span-2"
        >
          Search companies
        </button>
      </form>
      {submitted ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-600">
            {results.length} shown
            {file ? ` of ${file.count.toLocaleString('en-US')} NAIC identities` : ''}.
          </p>
          {results.map((row) => (
            <ResultRow key={row.naic} row={row} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
