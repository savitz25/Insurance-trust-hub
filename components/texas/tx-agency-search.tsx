'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  TX_AGENCY_LIMIT,
  filterTxAgencies,
  type TxAgencyFile,
  type TxAgencyRow,
} from '@/lib/texas-intelligence/search';

function ResultRow({ row }: { row: TxAgencyRow }) {
  const [npn, name, city, state, zip, types, appointments, licenses, expMax] = row;
  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <p className="font-semibold text-[#0A2540]">{name || 'Unnamed agency row'}</p>
      <p className="mt-1 text-sm text-slate-700">
        NPN {npn} · {licenses} TDI license row{licenses === 1 ? '' : 's'} · {city || 'UNKNOWN city'},{' '}
        {state || 'UNKNOWN state'} {zip}
      </p>
      <p className="mt-1 text-sm text-slate-700">
        License class: {types || 'UNKNOWN'} · latest listed expiration {expMax || 'UNKNOWN'}
      </p>
      <p className="mt-1 text-sm text-slate-700">
        Active company appointments in the acquired graph: {appointments.toLocaleString('en-US')}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        An appointment is a designation to represent a company. It is not a recommendation, a quality
        score, or proof the agency can sell every product. Phone, email, website, and street address
        are not in this official file.
      </p>
      <p className="mt-2 text-sm">
        <a
          href="https://www.tdi.texas.gov/agent/index.html"
          className="font-medium text-[#0284C7] underline underline-offset-2"
          rel="noopener noreferrer"
          target="_blank"
        >
          Verify with TDI license lookup
        </a>
      </p>
    </article>
  );
}

export function TexasAgencySearch({ licenseClasses }: { licenseClasses: string[] }) {
  const [file, setFile] = useState<TxAgencyFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [npn, setNpn] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [licenseClass, setLicenseClass] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/texas-tdi-agencies.json')
      .then((res) => {
        if (!res.ok) throw new Error(`inventory HTTP ${res.status}`);
        return res.json() as Promise<TxAgencyFile>;
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
    return filterTxAgencies(file.rows, { q, npn, state, zip, licenseClass });
  }, [file, submitted, q, npn, state, zip, licenseClass]);

  return (
    <section className="mt-10" aria-labelledby="tx-agency-search">
      <h2 id="tx-agency-search" className="text-lg font-semibold text-[#0A2540]">
        Agency research
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Search official TDI agency identities by name, NPN, listed state, ZIP, or license class.
        Results are capped at {TX_AGENCY_LIMIT} rows. This is not a ranking.
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
          Name / city / NPN
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Exact NPN
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={npn}
            onChange={(e) => setNpn(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <label className="text-sm">
          Listed state
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={state}
            onChange={(e) => setState(e.target.value)}
            maxLength={2}
          />
        </label>
        <label className="text-sm">
          ZIP prefix
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          License class
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={licenseClass}
            onChange={(e) => setLicenseClass(e.target.value)}
          >
            <option value="">Any official class</option>
            {licenseClasses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg bg-[#0A2540] px-4 py-2 text-sm font-medium text-white sm:col-span-2"
        >
          Search agencies
        </button>
      </form>
      {submitted ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-600">
            {results.length} shown
            {file ? ` of ${file.count.toLocaleString('en-US')} NPN identities` : ''}.
          </p>
          {results.map((row) => (
            <ResultRow key={`${row[0]}-${row[5]}`} row={row} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
