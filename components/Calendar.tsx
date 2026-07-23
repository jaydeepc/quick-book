"use client";

import { useState } from "react";
import { monthMatrix, monthLabel, WEEKDAYS, todayKey, parseKey } from "@/lib/dates";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

type Props = {
  /** First month shown, e.g. from the earliest available date. */
  initialMonth?: string; // any "YYYY-MM-DD" inside the month
  isEnabled: (key: string) => boolean;
  /** Filled brand style (chosen dates). */
  isSelected: (key: string) => boolean;
  /** Soft brand style (available but not chosen yet). */
  isMarked?: (key: string) => boolean;
  /** Ring highlight (date currently being viewed). */
  activeKey?: string | null;
  /** Muted strike-through style (e.g. every slot on this date is booked). */
  isDimmed?: (key: string) => boolean;
  onTap: (key: string) => void;
  /** Small count badge under a date (e.g. number of time slots picked). */
  badge?: (key: string) => number;
};

export default function Calendar({
  initialMonth,
  isEnabled,
  isSelected,
  isMarked,
  activeKey,
  isDimmed,
  onTap,
  badge,
}: Props) {
  const start = initialMonth ? parseKey(initialMonth) : new Date();
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const weeks = monthMatrix(view.y, view.m);
  const today = todayKey();

  function shift(delta: number) {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  return (
    <div className="select-none">
      <div className="flex items-center justify-between px-1 pb-3">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Previous month"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition hover:bg-brand-soft hover:text-brand-deep active:scale-95"
        >
          <ChevronLeftIcon />
        </button>
        <p className="text-sm font-bold tracking-wide text-ink">
          {monthLabel(view.y, view.m)}
        </p>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Next month"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition hover:bg-brand-soft hover:text-brand-deep active:scale-95"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="grid grid-cols-7 pb-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {weeks.flat().map((key, i) => {
          if (!key) return <span key={i} />;
          const enabled = isEnabled(key);
          const selected = isSelected(key);
          const marked = !selected && isMarked?.(key);
          const dimmed = !selected && !marked && isDimmed?.(key);
          const active = activeKey === key;
          const isToday = key === today;
          const count = badge?.(key) ?? 0;

          let cls =
            "relative mx-auto flex h-11 w-11 items-center justify-center rounded-full text-sm transition ";
          if (selected) {
            cls += "bg-brand font-bold text-white shadow-pop ";
          } else if (marked) {
            cls += "bg-brand-soft font-bold text-brand-deep ";
          } else if (dimmed) {
            cls += "bg-ink-soft/25 font-bold text-ink-soft line-through decoration-2 decoration-ink-soft/60 hover:bg-ink-soft/35 ";
          } else if (enabled) {
            cls += "font-semibold text-ink hover:bg-brand-soft ";
          } else {
            cls += "font-medium text-ink-faint/50 ";
          }
          if (active) cls += "ring-2 ring-brand-deep ring-offset-2 ring-offset-white ";
          if (enabled) cls += "active:scale-90 ";

          return (
            <button
              key={key}
              type="button"
              disabled={!enabled}
              onClick={() => onTap(key)}
              className={cls}
            >
              {parseInt(key.slice(8), 10)}
              {isToday && !selected && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-ink-soft" />
              )}
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
