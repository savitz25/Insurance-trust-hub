'use client';

import Link from 'next/link';
import { useRef, type PointerEvent, type ReactNode } from 'react';
import { pointerMovedPastCardScroll } from '@/components/ask-result-card-gesture';

type DragPoint = { x: number; y: number; lastX: number; lastY: number };

const interactiveCardClass =
  'relative min-w-0 cursor-pointer touch-pan-y rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm motion-safe:transition-[border-color,box-shadow,background-color] motion-safe:duration-150 motion-reduce:transition-none hover:border-[#0A2540]/25 hover:bg-[#F8FAFC] hover:shadow-md focus-within:border-[#0284C7] focus-within:ring-2 focus-within:ring-inset focus-within:ring-[#0284C7] sm:p-5';

const staticCardClass =
  'relative min-w-0 touch-pan-y rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5';

export function AskResultCardShell({ href, children }: { href: string | null; children: ReactNode }) {
  const drag = useRef<DragPoint | null>(null);
  const interactive = Boolean(href);

  function rememberPoint(event: PointerEvent<HTMLElement>) {
    drag.current = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY };
  }

  function trackPoint(event: PointerEvent<HTMLElement>) {
    const start = drag.current;
    if (!start) return;
    start.lastX = event.clientX;
    start.lastY = event.clientY;
  }

  return (
    <article
      data-ask-card
      data-ask-card-nav={interactive ? 'profile' : 'none'}
      className={interactive ? interactiveCardClass : staticCardClass}
      onPointerDown={interactive ? rememberPoint : undefined}
      onPointerMove={interactive ? trackPoint : undefined}
      onPointerCancel={interactive ? () => { drag.current = null; } : undefined}
    >
      {href ? (
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden="true"
          data-specialist-event="profile_open"
          data-ask-card-surface
          className="absolute inset-0 z-0 rounded-2xl"
          onClick={(event) => {
            const start = drag.current;
            drag.current = null;
            if (start && pointerMovedPastCardScroll(start.x, start.y, start.lastX, start.lastY)) event.preventDefault();
          }}
        />
      ) : null}
      <div className={href ? 'relative z-10 min-w-0 pointer-events-none' : 'relative min-w-0'}>{children}</div>
    </article>
  );
}
