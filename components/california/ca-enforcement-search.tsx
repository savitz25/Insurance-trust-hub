'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CA_ENFORCEMENT_LIMIT,
  filterCaEnforcement,
  type CaEnforcementFile,
  type CaEnforcementRow,
} from '@/lib/california-intelligence/search';

function ResultRow({ row }: { row: CaEnforcementRow }) {
  const [date, org, orgType, action, penalty, link] = row;
  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <p className="font-semibold text-[#0A2540]">{org || 'Unnamed organization row'}</p>
      <p className="mt-1 text-sm text-slate-700">
        {action} · {orgType || 'UNKNOWN type'} · {date || 'undated'}
        {penalty ? ` · source penalty field ${penalty}` : ''}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Organization name is not a plan ID. This row is not attached to an InsuranceTrustHub
        profile.
      </p>
      {link ? (
        <p className="mt-2 text-sm">
          <a
            href={link}
            className="font-medium text-[#0284C7] underline underline-offset-2"
            rel="noopener noreferrer"
            target="_blank"
          >
            Verify with DMHC action display
          </a>
        </p>
      ) : null}
    </article>
  );
}

export function CaliforniaEnforcementSearch({
  actions,
  years,
}: {
  actions: string[];
  years: string[];
}) {
  const [file, setFile] = useState<CaEnforcementFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [year, setYear] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/california-dmhc-enforcement.json')
      .then((res) => {
        if (!res.ok) throw new Error(`inventory HTTP ${res.status}`);
        return res.json() as Promise<CaEnforcementFile>;
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
    return filterCaEnforcement(file.rows, { q, action, year });
  }, [file, submitted, q, action, year]);

  return (
    <section className="mt-10" aria-labelledby="ca-enf-search">
      <h2 id="ca-enf-search" className="text-lg font-semibold text-[#0A2540]">
        DMHC enforcement research
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Filter acquired DMHC enforcement-action rows by source-native action class, year, or
        organization name. This is state-level event research. Name-only matching is not used to
        attach adverse evidence to profiles.
      </p>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-3"
        onSubmit={(ev) => {
          ev.preventDefault();
          setSubmitted(true);
        }}
      >
        <label className="text-sm sm:col-span-3">
          Organization name
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            value={q}
            onChange={(ev) => setQ(ev.target.value)}
            placeholder="Plan or entity name as published"
          />
        </label>
        <label className="text-sm">
          Action class
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            value={action}
            onChange={(ev) => setAction(ev.target.value)}
          >
            <option value="">Any source-native class</option>
            {actions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Year
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            value={year}
            onChange={(ev) => setYear(ev.target.value)}
          >
            <option value="">Any year</option>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="rounded-xl bg-[#0A2540] px-4 py-2 text-sm font-semibold text-white"
            disabled={!file}
          >
            Search acquired rows
          </button>
        </div>
      </form>
      {!file && !error ? (
        <p className="mt-3 text-sm text-slate-500">Loading acquired DMHC enforcement rows…</p>
      ) : null}
      {error ? <p className="mt-3 text-sm">Inventory unavailable ({error}).</p> : null}
      {submitted && file ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm">
            Showing {results.length}
            {results.length === CA_ENFORCEMENT_LIMIT ? '+' : ''} matching acquired rows.
          </p>
          {results.length === 0 ? (
            <p className="text-sm text-slate-500">
              No acquired rows matched. Absence from this extract is not a clean record.
            </p>
          ) : (
            results.map((row, i) => <ResultRow key={`${row[0]}-${row[1]}-${i}`} row={row} />)
          )}
        </div>
      ) : null}
    </section>
  );
}
