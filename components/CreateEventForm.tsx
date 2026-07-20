"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Calendar from "./Calendar";
import { fmtDate, fmtRange, todayKey } from "@/lib/dates";
import { ClockIcon, PlusIcon, XIcon, CheckIcon } from "./icons";

type TimeRange = { start: string; end: string };

function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(":").map(Number);
  const total = (h * 60 + m + mins) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function sameRange(a: TimeRange, b: TimeRange) {
  return a.start === b.start && a.end === b.end;
}

function TimeAdder({
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

export default function CreateEventForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [defaultTimes, setDefaultTimes] = useState<TimeRange[]>([
    { start: "10:00", end: "10:30" },
  ]);
  const [timesByDate, setTimesByDate] = useState<Record<string, TimeRange[]>>({});
  const [dateAdding, setDateAdding] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const today = todayKey();
  const dates = useMemo(() => Object.keys(timesByDate).sort(), [timesByDate]);
  const slotCount = dates.reduce((n, d) => n + timesByDate[d].length, 0);

  function addDefaultTime(r: TimeRange) {
    if (defaultTimes.some((t) => sameRange(t, r))) return;
    setDefaultTimes((ts) =>
      [...ts, r].sort((a, b) => a.start.localeCompare(b.start))
    );
    // Also add to every date already selected.
    setTimesByDate((map) => {
      const next: Record<string, TimeRange[]> = {};
      for (const [d, ts] of Object.entries(map)) {
        next[d] = ts.some((t) => sameRange(t, r))
          ? ts
          : [...ts, r].sort((a, b) => a.start.localeCompare(b.start));
      }
      return next;
    });
  }

  function removeDefaultTime(r: TimeRange) {
    setDefaultTimes((ts) => ts.filter((t) => !sameRange(t, r)));
    setTimesByDate((map) => {
      const next: Record<string, TimeRange[]> = {};
      for (const [d, ts] of Object.entries(map)) {
        next[d] = ts.filter((t) => !sameRange(t, r));
      }
      return next;
    });
  }

  function toggleDate(key: string) {
    setError("");
    setTimesByDate((map) => {
      const next = { ...map };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = [...defaultTimes];
      }
      return next;
    });
  }

  function removeDateTime(date: string, r: TimeRange) {
    setTimesByDate((map) => {
      const next = { ...map };
      next[date] = next[date].filter((t) => !sameRange(t, r));
      if (next[date].length === 0) delete next[date];
      return next;
    });
  }

  function addDateTime(date: string, r: TimeRange) {
    setTimesByDate((map) => {
      const ts = map[date] ?? [];
      if (ts.some((t) => sameRange(t, r))) return map;
      return {
        ...map,
        [date]: [...ts, r].sort((a, b) => a.start.localeCompare(b.start)),
      };
    });
    setDateAdding(null);
  }

  async function submit() {
    if (busy) return;
    if (!name.trim()) {
      setError("Give the event a name.");
      return;
    }
    if (slotCount === 0) {
      setError("Tap at least one date on the calendar.");
      return;
    }
    setBusy(true);
    setError("");
    const slots = dates.flatMap((d) =>
      timesByDate[d].map((t) => ({ date: d, start: t.start, end: t.end }))
    );
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        note: note.trim(),
        slots,
        firstLinkLabel: linkLabel.trim(),
      }),
    });
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/admin/events/${id}`);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="qb-pop-in space-y-4 pb-28">
      <div className="rounded-3xl bg-white p-5 shadow-card">
        <label className="text-xs font-extrabold uppercase tracking-wider text-ink-faint">
          Event name
        </label>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          placeholder="e.g. Q3 Business Review"
          className="mt-2 h-13 w-full rounded-2xl border-2 border-line bg-cream px-4 text-[15px] font-semibold text-ink outline-none transition placeholder:font-medium placeholder:text-ink-faint focus:border-brand focus:bg-white"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note for invitees (venue, agenda…)"
          className="mt-3 h-12 w-full rounded-2xl border-2 border-line bg-cream px-4 text-sm font-medium text-ink outline-none transition placeholder:text-ink-faint focus:border-brand focus:bg-white"
        />
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-card">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-brand" />
          <h2 className="text-sm font-extrabold text-ink">Time slots</h2>
        </div>
        <p className="mt-1 text-xs font-medium text-ink-soft">
          These times are offered on every date you pick. Fine-tune any date below.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {defaultTimes.map((t) => (
            <span
              key={t.start + t.end}
              className="flex items-center gap-1.5 rounded-full bg-brand-soft py-2 pl-3.5 pr-2 text-xs font-bold text-brand-deep"
            >
              {fmtRange(t.start, t.end)}
              <button
                type="button"
                onClick={() => removeDefaultTime(t)}
                aria-label="Remove time"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-white/70 text-brand-deep transition hover:bg-white active:scale-90"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3">
          <TimeAdder onAdd={addDefaultTime} />
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-card">
        <div className="flex items-center gap-2 pb-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand text-white">
            <CheckIcon className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-sm font-extrabold text-ink">Tap the dates you can offer</h2>
        </div>
        <Calendar
          isEnabled={(k) => k >= today}
          isSelected={(k) => Boolean(timesByDate[k])}
          onTap={toggleDate}
          badge={(k) => timesByDate[k]?.length ?? 0}
        />
      </div>

      {dates.length > 0 && (
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <h2 className="text-sm font-extrabold text-ink">
            Selected dates{" "}
            <span className="font-bold text-ink-faint">
              · {slotCount} slot{slotCount === 1 ? "" : "s"}
            </span>
          </h2>
          <ul className="mt-3 space-y-3">
            {dates.map((d) => (
              <li key={d} className="rounded-2xl border border-line bg-cream/60 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-ink">{fmtDate(d)}</p>
                  <button
                    type="button"
                    onClick={() => toggleDate(d)}
                    className="text-[11px] font-bold text-ink-faint underline-offset-2 hover:text-brand-deep hover:underline"
                  >
                    Remove day
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {timesByDate[d].map((t) => (
                    <span
                      key={t.start + t.end}
                      className="flex items-center gap-1.5 rounded-full bg-white py-1.5 pl-3 pr-1.5 text-xs font-bold text-ink ring-1 ring-line"
                    >
                      {fmtRange(t.start, t.end)}
                      <button
                        type="button"
                        onClick={() => removeDateTime(d, t)}
                        aria-label="Remove time"
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-cream text-ink-soft transition hover:bg-brand-soft hover:text-brand-deep active:scale-90"
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
        </div>
      )}

      <div className="rounded-3xl bg-white p-5 shadow-card">
        <h2 className="text-sm font-extrabold text-ink">First share group</h2>
        <p className="mt-1 text-xs font-medium text-ink-soft">
          A share link is created with the event — name the group it&rsquo;s for. You can
          add more groups later (e.g. one per SLT).
        </p>
        <input
          value={linkLabel}
          onChange={(e) => setLinkLabel(e.target.value)}
          placeholder="e.g. SLT — West Zone (default: General)"
          className="mt-3 h-12 w-full rounded-2xl border-2 border-line bg-cream px-4 text-sm font-semibold text-ink outline-none transition placeholder:font-medium placeholder:text-ink-faint focus:border-brand focus:bg-white"
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3 pb-safe">
          {error ? (
            <p className="qb-shake flex-1 text-xs font-bold text-brand-deep">{error}</p>
          ) : (
            <p className="flex-1 text-xs font-semibold text-ink-soft">
              {slotCount > 0
                ? `${dates.length} day${dates.length === 1 ? "" : "s"} · ${slotCount} slot${slotCount === 1 ? "" : "s"} ready`
                : "Pick dates to continue"}
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="h-12 shrink-0 rounded-2xl bg-brand px-6 text-sm font-bold text-white shadow-pop transition hover:bg-brand-deep active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create event"}
          </button>
        </div>
      </div>
    </div>
  );
}
