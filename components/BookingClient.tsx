"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { PublicEvent, Slot } from "@/lib/types";
import Calendar from "./Calendar";
import { fmtDate, fmtRange } from "@/lib/dates";
import { CheckIcon, ClockIcon, UsersIcon, XIcon } from "./icons";

export default function BookingClient({
  event,
  token,
}: {
  event: PublicEvent;
  token: string;
}) {
  const availableDates = useMemo(
    () => [...new Set(event.slots.map((s) => s.date))].sort(),
    [event.slots]
  );
  const [activeDate, setActiveDate] = useState(availableDates[0] ?? null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of event.slots) {
      map.set(s.date, [...(map.get(s.date) ?? []), s]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.start.localeCompare(b.start));
    }
    return map;
  }, [event.slots]);

  const selectedSlots = useMemo(
    () =>
      event.slots
        .filter((s) => selected.has(s.id))
        .sort((a, b) =>
          a.date === b.date
            ? a.start.localeCompare(b.start)
            : a.date.localeCompare(b.date)
        ),
    [event.slots, selected]
  );

  const selectedCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of selectedSlots) {
      map.set(s.date, (map.get(s.date) ?? 0) + 1);
    }
    return map;
  }, [selectedSlots]);

  function toggleSlot(id: string) {
    setError("");
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (busy) return;
    if (selected.size === 0) {
      setError("Tap a date and pick at least one time.");
      return;
    }
    if (!name.trim()) {
      setError("Add your name so the organiser knows it's you.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch(`/api/public/events/${token}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), slotIds: [...selected] }),
    });
    if (res.ok) {
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't send. Please try again.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main className="qb-backdrop flex min-h-screen flex-col items-center px-6 py-10">
        <Image src="/piramal-logo.svg" alt="Piramal Finance" width={130} height={60} />
        <div className="qb-pop-in mt-8 w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/success.jpg" alt="" className="mx-auto h-44 w-44 object-contain" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">
            Done, {name.trim().split(" ")[0]}!
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Your times are with the organiser.
          </p>
          <ul className="mt-5 space-y-2 text-left">
            {selectedSlots.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-2.5 rounded-2xl bg-brand-faint px-4 py-3 text-sm font-bold text-ink"
              >
                <CheckIcon className="h-4 w-4 shrink-0 text-brand" />
                {fmtDate(s.date)} · {fmtRange(s.start, s.end)}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-8 text-xs font-medium text-ink-faint">
          Quick Block · Piramal Finance
        </p>
      </main>
    );
  }

  const activeSlots = activeDate ? (slotsByDate.get(activeDate) ?? []) : [];

  return (
    <main className="qb-backdrop min-h-screen pb-36">
      <div className="mx-auto w-full max-w-md px-4 pt-8">
        <div className="flex justify-center">
          <Image src="/piramal-logo.svg" alt="Piramal Finance" width={130} height={60} priority />
        </div>

        <div className="qb-pop-in mt-6 overflow-hidden rounded-3xl bg-white shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/hero.jpg" alt="" className="h-36 w-full object-cover sm:h-44" />
          <div className="p-5">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-[11px] font-extrabold text-brand-deep">
                <UsersIcon className="h-3 w-3" />
                {event.linkLabel}
              </span>
            </div>
            <h1 className="mt-2.5 text-2xl font-extrabold leading-tight tracking-tight text-ink">
              {event.name}
            </h1>
            {event.note && (
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{event.note}</p>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-ink-soft">
              <ClockIcon className="h-3.5 w-3.5 text-brand" />
              Tap a date, pick every time that works. You can choose more than one.
            </p>
          </div>
        </div>

        <div className="qb-pop-in mt-4 rounded-3xl bg-white p-5 shadow-card">
          <Calendar
            initialMonth={availableDates[0]}
            isEnabled={(k) => slotsByDate.has(k)}
            isMarked={(k) => slotsByDate.has(k)}
            isSelected={(k) => (selectedCountByDate.get(k) ?? 0) > 0}
            activeKey={activeDate}
            onTap={setActiveDate}
            badge={(k) => selectedCountByDate.get(k) ?? 0}
          />
        </div>

        {activeDate && (
          <div key={activeDate} className="qb-pop-in mt-4 rounded-3xl bg-white p-5 shadow-card">
            <p className="text-sm font-extrabold text-ink">{fmtDate(activeDate, true)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {activeSlots.map((s) => {
                const on = selected.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSlot(s.id)}
                    className={`flex h-12 items-center justify-center gap-1.5 rounded-2xl text-[13px] font-bold transition active:scale-95 ${
                      on
                        ? "bg-brand text-white shadow-pop"
                        : "bg-cream text-ink ring-1 ring-line hover:ring-brand/50"
                    }`}
                  >
                    {on && <CheckIcon className="h-4 w-4" />}
                    {fmtRange(s.start, s.end)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedSlots.length > 0 && (
          <div className="qb-pop-in mt-4 rounded-3xl bg-white p-5 shadow-card">
            <p className="text-xs font-extrabold uppercase tracking-wider text-ink-faint">
              Your picks
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {selectedSlots.map((s) => (
                <span
                  key={s.id}
                  className="flex items-center gap-1.5 rounded-full bg-brand-soft py-2 pl-3.5 pr-2 text-xs font-bold text-brand-deep"
                >
                  {fmtDate(s.date)} · {fmtRange(s.start, s.end)}
                  <button
                    type="button"
                    onClick={() => toggleSlot(s.id)}
                    aria-label="Remove"
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-white/70 transition hover:bg-white active:scale-90"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="Your name"
              autoComplete="name"
              className="mt-4 h-13 w-full rounded-2xl border-2 border-line bg-cream px-4 text-[15px] font-semibold text-ink outline-none transition placeholder:font-medium placeholder:text-ink-faint focus:border-brand focus:bg-white"
            />
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4 py-3 pb-safe">
          {error ? (
            <p className="qb-shake flex-1 text-xs font-bold text-brand-deep">{error}</p>
          ) : (
            <p className="flex-1 text-xs font-semibold text-ink-soft">
              {selected.size === 0
                ? "Pick your times"
                : `${selected.size} time${selected.size === 1 ? "" : "s"} selected`}
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="h-12 shrink-0 rounded-2xl bg-brand px-6 text-sm font-bold text-white shadow-pop transition hover:bg-brand-deep active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send availability"}
          </button>
        </div>
      </div>
    </main>
  );
}
