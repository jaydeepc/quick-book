"use client";

import { useMemo, useState } from "react";
import type { Slot } from "@/lib/types";
import Calendar from "./Calendar";
import TimeAdder, { sameRange, type TimeRange } from "./TimeAdder";
import { fmtDate, fmtRange, todayKey } from "@/lib/dates";
import { PlusIcon, XIcon } from "./icons";

/**
 * Lets the admin extend an existing event: stage extra dates and extra times
 * on current dates, then save them in one go. Existing slots are never touched.
 */
export default function AddSlotsEditor({
  eventId,
  slots,
  onClose,
  onSaved,
}: {
  eventId: string;
  slots: Slot[];
  onClose: () => void;
  onSaved: (added: number) => void;
}) {
  const today = todayKey();

  const existingByDate = useMemo(() => {
    const map = new Map<string, TimeRange[]>();
    for (const s of slots) {
      map.set(s.date, [...(map.get(s.date) ?? []), { start: s.start, end: s.end }]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.start.localeCompare(b.start));
    }
    return map;
  }, [slots]);

  // Template = times of the event's first date; used to prefill brand-new dates.
  const [template, setTemplate] = useState<TimeRange[]>(() => {
    const firstDate = [...existingByDate.keys()].sort()[0];
    return firstDate ? [...existingByDate.get(firstDate)!] : [];
  });
  const [staged, setStaged] = useState<Record<string, TimeRange[]>>({});
  const [dateAdding, setDateAdding] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const stagedDates = useMemo(() => Object.keys(staged).sort(), [staged]);
  const stagedCount = stagedDates.reduce((n, d) => n + staged[d].length, 0);

  function notAlreadyOffered(date: string, ts: TimeRange[]): TimeRange[] {
    const existing = existingByDate.get(date) ?? [];
    return ts.filter((t) => !existing.some((e) => sameRange(e, t)));
  }

  function toggleDate(key: string) {
    setError("");
    setStaged((map) => {
      const next = { ...map };
      if (next[key]) {
        delete next[key];
      } else {
        // New dates start from the template; existing dates start empty so the
        // admin explicitly adds the extra times.
        next[key] = existingByDate.has(key) ? [] : notAlreadyOffered(key, template);
      }
      return next;
    });
  }

  function addTemplateTime(r: TimeRange) {
    setError("");
    if (!template.some((t) => sameRange(t, r))) {
      setTemplate((ts) => [...ts, r].sort((a, b) => a.start.localeCompare(b.start)));
    }
    // Also stage it on every date currently being edited.
    setStaged((map) => {
      const next: Record<string, TimeRange[]> = {};
      for (const [d, ts] of Object.entries(map)) {
        const addable = notAlreadyOffered(d, [r]);
        next[d] =
          addable.length && !ts.some((t) => sameRange(t, r))
            ? [...ts, r].sort((a, b) => a.start.localeCompare(b.start))
            : ts;
      }
      return next;
    });
  }

  function addDateTime(date: string, r: TimeRange) {
    setError("");
    const addable = notAlreadyOffered(date, [r]);
    if (!addable.length) {
      setError(`${fmtRange(r.start, r.end)} is already offered on ${fmtDate(date)}.`);
      return;
    }
    setStaged((map) => {
      const ts = map[date] ?? [];
      if (ts.some((t) => sameRange(t, r))) return map;
      return {
        ...map,
        [date]: [...ts, r].sort((a, b) => a.start.localeCompare(b.start)),
      };
    });
    setDateAdding(null);
  }

  function removeDateTime(date: string, r: TimeRange) {
    setStaged((map) => {
      const next = { ...map };
      next[date] = next[date].filter((t) => !sameRange(t, r));
      if (next[date].length === 0) delete next[date];
      return next;
    });
  }

  async function save() {
    if (busy) return;
    if (stagedCount === 0) {
      setError("Tap a date and add at least one new time.");
      return;
    }
    setBusy(true);
    setError("");
    const payload = stagedDates.flatMap((d) =>
      staged[d].map((t) => ({ date: d, start: t.start, end: t.end }))
    );
    const res = await fetch(`/api/admin/events/${eventId}/slots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots: payload }),
    });
    if (res.ok) {
      const { added } = await res.json();
      onSaved(added);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't save. Try again.");
      setBusy(false);
    }
  }

  return (
    <section className="qb-pop-in rounded-3xl bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4 text-brand" />
          <h2 className="text-sm font-extrabold text-ink">Add dates &amp; times</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close editor"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition hover:bg-brand-soft hover:text-brand-deep active:scale-90"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1 text-xs font-medium text-ink-soft">
        Tap a new date to offer it, or an existing date to add extra times. Current
        slots and responses are kept as they are.
      </p>

      <div className="mt-3 rounded-2xl border border-line bg-cream/40 p-3">
        <Calendar
          initialMonth={today}
          isEnabled={(k) => k >= today}
          isMarked={(k) => existingByDate.has(k)}
          isSelected={(k) => Boolean(staged[k])}
          onTap={toggleDate}
          badge={(k) => staged[k]?.length ?? 0}
        />
        <p className="mt-1 text-center text-[11px] font-semibold text-ink-faint">
          Peach dates are already part of this event
        </p>
      </div>

      {template.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-faint">
            Times used for new dates
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {template.map((t) => (
              <span
                key={t.start + t.end}
                className="rounded-full bg-brand-soft px-3.5 py-2 text-xs font-bold text-brand-deep"
              >
                {fmtRange(t.start, t.end)}
              </span>
            ))}
            <TimeAdder compact onAdd={addTemplateTime} />
          </div>
        </div>
      )}

      {stagedDates.length > 0 && (
        <ul className="mt-4 space-y-3">
          {stagedDates.map((d) => (
            <li key={d} className="rounded-2xl border border-line bg-cream/60 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-ink">
                  {fmtDate(d)}
                  {existingByDate.has(d) && (
                    <span className="ml-2 rounded-full bg-line/60 px-2 py-0.5 text-[10px] font-bold text-ink-soft">
                      existing day
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => toggleDate(d)}
                  className="text-[11px] font-bold text-ink-faint underline-offset-2 hover:text-brand-deep hover:underline"
                >
                  Undo day
                </button>
              </div>
              {existingByDate.has(d) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {existingByDate.get(d)!.map((t) => (
                    <span
                      key={t.start + t.end}
                      className="rounded-full bg-line/50 px-2.5 py-1 text-[11px] font-semibold text-ink-soft"
                    >
                      {fmtRange(t.start, t.end)}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {staged[d].map((t) => (
                  <span
                    key={t.start + t.end}
                    className="flex items-center gap-1.5 rounded-full bg-brand py-1.5 pl-3 pr-1.5 text-xs font-bold text-white"
                  >
                    {fmtRange(t.start, t.end)}
                    <button
                      type="button"
                      onClick={() => removeDateTime(d, t)}
                      aria-label="Remove time"
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/35 active:scale-90"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {dateAdding === d ? (
                  <TimeAdder compact onAdd={(r) => addDateTime(d, r)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setDateAdding(d)}
                    className="flex items-center gap-1 rounded-full border-2 border-dashed border-line px-3 py-1.5 text-xs font-bold text-ink-soft transition hover:border-brand hover:text-brand-deep active:scale-95"
                  >
                    <PlusIcon className="h-3 w-3" />
                    Time
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center gap-3">
        {error ? (
          <p className="qb-shake flex-1 text-xs font-bold text-brand-deep">{error}</p>
        ) : (
          <p className="flex-1 text-xs font-semibold text-ink-soft">
            {stagedCount > 0
              ? `${stagedCount} new slot${stagedCount === 1 ? "" : "s"} ready`
              : "Nothing staged yet"}
          </p>
        )}
        <button
          type="button"
          onClick={save}
          disabled={busy || stagedCount === 0}
          className="h-11 shrink-0 rounded-2xl bg-brand px-5 text-sm font-bold text-white shadow-pop transition hover:bg-brand-deep active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
        >
          {busy ? "Saving…" : "Save slots"}
        </button>
      </div>
    </section>
  );
}
