"use client";

import { useMemo, useState } from "react";
import type { Slot } from "@/lib/types";
import Calendar from "./Calendar";
import TimeAdder, { sameRange, type TimeRange } from "./TimeAdder";
import { fmtDate, fmtRange, todayKey } from "@/lib/dates";
import { LockIcon, PlusIcon, XIcon } from "./icons";

/**
 * Full slots editor for an existing event: stage extra dates/times AND stage
 * removals of current times or whole days, then save everything in one go.
 * Removing a booked slot cancels that person's booking.
 */
export default function SlotsEditor({
  eventId,
  slots,
  bookedBy,
  onClose,
  onSaved,
}: {
  eventId: string;
  slots: Slot[];
  bookedBy: Record<string, string>;
  onClose: () => void;
  onSaved: (added: number, removed: number) => void;
}) {
  const today = todayKey();

  const existingByDate = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      map.set(s.date, [...(map.get(s.date) ?? []), s]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.start.localeCompare(b.start));
    }
    return map;
  }, [slots]);

  const [template, setTemplate] = useState<TimeRange[]>(() => {
    const firstDate = [...existingByDate.keys()].sort()[0];
    return firstDate
      ? existingByDate.get(firstDate)!.map((s) => ({ start: s.start, end: s.end }))
      : [];
  });
  const [stagedAdds, setStagedAdds] = useState<Record<string, TimeRange[]>>({});
  const [removals, setRemovals] = useState<Set<string>>(new Set());
  const [dateAdding, setDateAdding] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const allDates = useMemo(
    () => [...new Set([...existingByDate.keys(), ...Object.keys(stagedAdds)])].sort(),
    [existingByDate, stagedAdds]
  );
  const addCount = Object.values(stagedAdds).reduce((n, ts) => n + ts.length, 0);
  const removeCount = removals.size;
  const bookedRemovals = [...removals].filter((id) => bookedBy[id]).length;

  /** Times on a date that will still exist after save (existing minus removals). */
  function keptTimes(date: string): TimeRange[] {
    return (existingByDate.get(date) ?? [])
      .filter((s) => !removals.has(s.id))
      .map((s) => ({ start: s.start, end: s.end }));
  }

  function tapDate(key: string) {
    setError("");
    if (existingByDate.has(key)) {
      // Existing day: open its time adder in the list below.
      setDateAdding(key);
      return;
    }
    setStagedAdds((map) => {
      const next = { ...map };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = [...template];
      }
      return next;
    });
  }

  function addTemplateTime(r: TimeRange) {
    setError("");
    if (!template.some((t) => sameRange(t, r))) {
      setTemplate((ts) => [...ts, r].sort((a, b) => a.start.localeCompare(b.start)));
    }
    setStagedAdds((map) => {
      const next: Record<string, TimeRange[]> = {};
      for (const [d, ts] of Object.entries(map)) {
        const dupe =
          ts.some((t) => sameRange(t, r)) ||
          keptTimes(d).some((t) => sameRange(t, r));
        next[d] = dupe
          ? ts
          : [...ts, r].sort((a, b) => a.start.localeCompare(b.start));
      }
      return next;
    });
  }

  function addTimeToDate(date: string, r: TimeRange) {
    setError("");
    // Re-adding a time that's staged for removal simply restores it.
    const removedTwin = (existingByDate.get(date) ?? []).find(
      (s) => removals.has(s.id) && sameRange({ start: s.start, end: s.end }, r)
    );
    if (removedTwin) {
      setRemovals((prev) => {
        const next = new Set(prev);
        next.delete(removedTwin.id);
        return next;
      });
      setDateAdding(null);
      return;
    }
    if (keptTimes(date).some((t) => sameRange(t, r))) {
      setError(`${fmtRange(r.start, r.end)} is already offered on ${fmtDate(date)}.`);
      return;
    }
    setStagedAdds((map) => {
      const ts = map[date] ?? [];
      if (ts.some((t) => sameRange(t, r))) return map;
      return {
        ...map,
        [date]: [...ts, r].sort((a, b) => a.start.localeCompare(b.start)),
      };
    });
    setDateAdding(null);
  }

  function removeStagedAdd(date: string, r: TimeRange) {
    setStagedAdds((map) => {
      const next = { ...map };
      next[date] = (next[date] ?? []).filter((t) => !sameRange(t, r));
      if (next[date].length === 0) delete next[date];
      return next;
    });
  }

  function toggleRemoval(id: string) {
    setError("");
    setRemovals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleDay(date: string) {
    setError("");
    const existing = existingByDate.get(date) ?? [];
    if (existing.length === 0) {
      // A purely new day: undo its staged adds.
      setStagedAdds((map) => {
        const next = { ...map };
        delete next[date];
        return next;
      });
      return;
    }
    const allRemoved = existing.every((s) => removals.has(s.id));
    setRemovals((prev) => {
      const next = new Set(prev);
      for (const s of existing) {
        if (allRemoved) next.delete(s.id);
        else next.add(s.id);
      }
      return next;
    });
    if (!allRemoved) {
      setStagedAdds((map) => {
        const next = { ...map };
        delete next[date];
        return next;
      });
    }
  }

  async function save() {
    if (busy) return;
    if (addCount === 0 && removeCount === 0) {
      setError("Nothing to save yet.");
      return;
    }
    if (slots.length - removeCount + addCount === 0) {
      setError("An event needs at least one slot — delete the event instead.");
      return;
    }
    setBusy(true);
    setError("");
    const add = Object.entries(stagedAdds).flatMap(([d, ts]) =>
      ts.map((t) => ({ date: d, start: t.start, end: t.end }))
    );
    const res = await fetch(`/api/admin/events/${eventId}/slots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ add, removeIds: [...removals] }),
    });
    if (res.ok) {
      const { added, removed } = await res.json();
      onSaved(added, removed);
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
          <h2 className="text-sm font-extrabold text-ink">Edit dates &amp; times</h2>
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
        Tap a fresh date to offer it, or manage each day below — remove times with the
        ×, add extra ones, or remove a whole day.
      </p>

      <div className="mt-3 rounded-2xl border border-line bg-cream/40 p-3">
        <Calendar
          initialMonth={today}
          isEnabled={(k) => k >= today}
          isMarked={(k) => existingByDate.has(k)}
          isSelected={(k) => Boolean(stagedAdds[k]) && !existingByDate.has(k)}
          onTap={tapDate}
          badge={(k) => stagedAdds[k]?.length ?? 0}
        />
        <p className="mt-1 text-center text-[11px] font-semibold text-ink-faint">
          Peach dates are part of this event — tap one to add times to it
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

      <ul className="mt-4 space-y-3">
        {allDates.map((d) => {
          const existing = existingByDate.get(d) ?? [];
          const isNewDay = existing.length === 0;
          const dayFullyRemoved =
            !isNewDay && existing.every((s) => removals.has(s.id));
          return (
            <li key={d} className="rounded-2xl border border-line bg-cream/60 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-ink">
                  {fmtDate(d)}
                  {isNewDay && (
                    <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand-deep">
                      new day
                    </span>
                  )}
                  {dayFullyRemoved && (
                    <span className="ml-2 rounded-full bg-ink-soft px-2 py-0.5 text-[10px] font-bold text-white">
                      will be removed
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => toggleDay(d)}
                  className="text-[11px] font-bold text-ink-faint underline-offset-2 hover:text-brand-deep hover:underline"
                >
                  {isNewDay ? "Undo day" : dayFullyRemoved ? "Restore day" : "Remove day"}
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {existing.map((s) => {
                  const booked = bookedBy[s.id];
                  const removed = removals.has(s.id);
                  if (removed) {
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleRemoval(s.id)}
                        title="Tap to restore"
                        className="flex items-center gap-1.5 rounded-full bg-ink-soft py-1.5 pl-3 pr-2 text-xs font-bold text-white line-through decoration-white/60 transition hover:bg-ink-soft/80 active:scale-95"
                      >
                        {fmtRange(s.start, s.end)}
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 no-underline">
                          ↺
                        </span>
                      </button>
                    );
                  }
                  return (
                    <span
                      key={s.id}
                      className="flex items-center gap-1.5 rounded-full bg-white py-1.5 pl-3 pr-1.5 text-xs font-bold text-ink ring-1 ring-line"
                    >
                      {booked && <LockIcon className="h-3 w-3 text-ink-soft" />}
                      {fmtRange(s.start, s.end)}
                      <button
                        type="button"
                        onClick={() => toggleRemoval(s.id)}
                        aria-label="Remove time"
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-cream text-ink-soft transition hover:bg-brand-soft hover:text-brand-deep active:scale-90"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}

                {(stagedAdds[d] ?? []).map((t) => (
                  <span
                    key={t.start + t.end}
                    className="flex items-center gap-1.5 rounded-full bg-brand py-1.5 pl-3 pr-1.5 text-xs font-bold text-white"
                  >
                    {fmtRange(t.start, t.end)}
                    <button
                      type="button"
                      onClick={() => removeStagedAdd(d, t)}
                      aria-label="Undo added time"
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/35 active:scale-90"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}

                {dateAdding === d ? (
                  <TimeAdder compact onAdd={(r) => addTimeToDate(d, r)} />
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
          );
        })}
      </ul>

      {bookedRemovals > 0 && (
        <p className="mt-3 rounded-2xl bg-brand-soft px-4 py-3 text-xs font-bold text-brand-deep">
          ⚠️ {bookedRemovals} of the times you&rsquo;re removing{" "}
          {bookedRemovals === 1 ? "is" : "are"} already booked — those bookings will be
          cancelled.
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        {error ? (
          <p className="qb-shake flex-1 text-xs font-bold text-brand-deep">{error}</p>
        ) : (
          <p className="flex-1 text-xs font-semibold text-ink-soft">
            {addCount === 0 && removeCount === 0
              ? "Nothing staged yet"
              : [
                  addCount > 0 ? `${addCount} to add` : null,
                  removeCount > 0 ? `${removeCount} to remove` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
        )}
        <button
          type="button"
          onClick={save}
          disabled={busy || (addCount === 0 && removeCount === 0)}
          className="h-11 shrink-0 rounded-2xl bg-brand px-5 text-sm font-bold text-white shadow-pop transition hover:bg-brand-deep active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </section>
  );
}
