'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'ith-ins-home-checklist-v1';

export function HomeIntelChecklist({
  items,
}: {
  items: Array<{ id: string; label: string; href: string }>;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, []);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const done = items.filter((item) => checked[item.id]).length;

  return (
    <div>
      <p className="text-sm text-[#1E293B]">
        {done} of {items.length} research areas reviewed. This is your process — not an Agent Score.
      </p>
      <ul className="mt-3 space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <label className="flex min-h-11 items-start gap-3 text-sm text-[#1E293B]">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={Boolean(checked[item.id])}
                onChange={() => toggle(item.id)}
              />
              <span>
                {item.label}{' '}
                <a href={item.href} className="font-medium text-[#0284C7] underline-offset-2 hover:underline">
                  Open related research
                </a>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
