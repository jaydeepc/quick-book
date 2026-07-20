"use client";

import { useState } from "react";
import { PlusIcon } from "./icons";

export type TimeRange = { start: string; end: string };

export function sameRange(a: TimeRange, b: TimeRange) {
  return a.start === b.start && a.end === b.end;
}

function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(":").map(Number);
  const total = (h * 60 + m + mins) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export default function TimeAdder({
  onAdd,
  compact,
}: {
  onAdd: (r: TimeRange) => void;
  compact?: boolean;
}) {
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("10:30");

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "flex-wrap"}`}>
      <input
        type="time"
        value={start}
        onChange={(e) => {
          const v = e.target.value;
          setStart(v);
          if (v && end <= v) setEnd(addMinutes(v, 30));
        }}
        className="h-11 rounded-xl border-2 border-line bg-white px-2.5 text-sm font-semibold text-ink outline-none focus:border-brand"
      />
      <span className="text-xs font-bold text-ink-faint">to</span>
      <input
        type="time"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        className="h-11 rounded-xl border-2 border-line bg-white px-2.5 text-sm font-semibold text-ink outline-none focus:border-brand"
      />
      <button
        type="button"
        disabled={!start || !end || end <= start}
        onClick={() => onAdd({ start, end })}
        className="flex h-11 items-center gap-1 rounded-xl bg-ink px-3.5 text-xs font-bold text-white transition hover:bg-ink/90 active:scale-95 disabled:opacity-40"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Add
      </button>
    </div>
  );
}
