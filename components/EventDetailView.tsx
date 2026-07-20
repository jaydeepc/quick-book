"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EventDetail } from "@/lib/types";
import { fmtDate, fmtRange } from "@/lib/dates";
import AddSlotsEditor from "./AddSlotsEditor";
import CopyButton from "./CopyButton";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ClockIcon,
  DownloadIcon,
  LinkIcon,
  PlusIcon,
  RefreshIcon,
  TrashIcon,
  UsersIcon,
} from "./icons";

export default function EventDetailView({ detail }: { detail: EventDetail }) {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [newLabel, setNewLabel] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [editingSlots, setEditingSlots] = useState(false);
  const [savedNote, setSavedNote] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? detail.responses
        : detail.responses.filter((r) => r.linkId === filter),
    [detail.responses, filter]
  );

  const ranked = useMemo(() => {
    const votes = new Map<string, string[]>();
    for (const s of detail.slots) votes.set(s.id, []);
    for (const r of filtered) {
      for (const id of r.slotIds) votes.get(id)?.push(r.name);
    }
    return [...detail.slots]
      .map((s) => ({ slot: s, names: votes.get(s.id) ?? [] }))
      .sort((a, b) => {
        if (b.names.length !== a.names.length) return b.names.length - a.names.length;
        return a.slot.date === b.slot.date
          ? a.slot.start.localeCompare(b.slot.start)
          : a.slot.date.localeCompare(b.slot.date);
      });
  }, [detail.slots, filtered]);

  const maxVotes = ranked[0]?.names.length ?? 0;
  const dateCount = new Set(detail.slots.map((s) => s.date)).size;

  async function addLink() {
    const label = newLabel.trim();
    if (!label || addingLink) return;
    setAddingLink(true);
    const res = await fetch(`/api/admin/events/${detail.id}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    setAddingLink(false);
    if (res.ok) {
      setNewLabel("");
      router.refresh();
    }
  }

  async function deleteEvent() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    await fetch(`/api/admin/events/${detail.id}`, { method: "DELETE" });
    router.push("/admin");
    router.refresh();
  }

  async function pdf() {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const { downloadEventPdf } = await import("@/lib/pdf");
      await downloadEventPdf(detail);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="qb-pop-in space-y-4 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <Link
            href="/admin"
            className="flex h-9 items-center gap-1 rounded-full pr-3 text-sm font-bold text-ink-soft transition hover:text-brand-deep"
          >
            <ChevronLeftIcon className="h-5 w-5" />
            Events
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.refresh()}
              aria-label="Refresh responses"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-soft shadow-card transition hover:text-brand-deep active:scale-95"
            >
              <RefreshIcon className="h-4.5 w-4.5" />
            </button>
            <button
              type="button"
              onClick={deleteEvent}
              className={`flex h-10 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-bold shadow-card transition active:scale-95 ${
                confirmDelete
                  ? "bg-brand text-white"
                  : "bg-white text-ink-soft hover:text-brand-deep"
              }`}
            >
              <TrashIcon className="h-4 w-4" />
              {confirmDelete ? "Tap to confirm" : "Delete"}
            </button>
          </div>
        </div>
        <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight text-ink">
          {detail.name}
        </h1>
        {detail.note && <p className="mt-1 text-sm text-ink-soft">{detail.note}</p>}
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
          <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-ink-soft shadow-card">
            <CalendarIcon className="h-3.5 w-3.5 text-brand" />
            {dateCount} {dateCount === 1 ? "day" : "days"}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-ink-soft shadow-card">
            <ClockIcon className="h-3.5 w-3.5 text-brand" />
            {detail.slots.length} slots
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-ink-soft shadow-card">
            <UsersIcon className="h-3.5 w-3.5 text-brand" />
            {detail.responses.length}{" "}
            {detail.responses.length === 1 ? "response" : "responses"}
          </span>
          {!editingSlots && (
            <button
              type="button"
              onClick={() => {
                setSavedNote("");
                setEditingSlots(true);
              }}
              className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-white shadow-card transition hover:bg-ink/90 active:scale-95"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add dates / times
            </button>
          )}
        </div>
        {savedNote && (
          <p className="qb-pop-in mt-2 text-xs font-bold text-emerald-600">{savedNote}</p>
        )}
      </div>

      {editingSlots && (
        <AddSlotsEditor
          eventId={detail.id}
          slots={detail.slots}
          onClose={() => setEditingSlots(false)}
          onSaved={(added) => {
            setEditingSlots(false);
            setSavedNote(
              `Added ${added} new slot${added === 1 ? "" : "s"} — all share links now show them.`
            );
            router.refresh();
          }}
        />
      )}

      {/* Share links */}
      <section className="rounded-3xl bg-white p-5 shadow-card">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-brand" />
          <h2 className="text-sm font-extrabold text-ink">Share links</h2>
        </div>
        <p className="mt-1 text-xs font-medium text-ink-soft">
          One link per group (e.g. per SLT). Responses stay grouped by link.
        </p>
        <ul className="mt-3 space-y-2.5">
          {detail.links.map((l) => (
            <li
              key={l.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-cream/60 p-3"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-bold text-ink">{l.label}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      l.responseCount > 0
                        ? "bg-brand-soft text-brand-deep"
                        : "bg-line/60 text-ink-faint"
                    }`}
                  >
                    {l.responseCount} in
                  </span>
                </span>
                <span className="mt-0.5 block truncate font-mono text-[11px] text-ink-faint">
                  {origin ? `${origin}/e/${l.token}` : `/e/${l.token}`}
                </span>
              </span>
              <a
                href={`/e/${l.token}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-full px-2 py-2 text-[11px] font-bold text-ink-soft underline-offset-2 hover:text-brand-deep hover:underline"
              >
                Open
              </a>
              <CopyButton text={origin ? `${origin}/e/${l.token}` : `/e/${l.token}`} />
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addLink()}
            placeholder="New group, e.g. SLT — North"
            className="h-11 min-w-0 flex-1 rounded-2xl border-2 border-line bg-cream px-3.5 text-sm font-semibold text-ink outline-none transition placeholder:font-medium placeholder:text-ink-faint focus:border-brand focus:bg-white"
          />
          <button
            type="button"
            onClick={addLink}
            disabled={!newLabel.trim() || addingLink}
            className="flex h-11 shrink-0 items-center gap-1 rounded-2xl bg-ink px-4 text-xs font-bold text-white transition hover:bg-ink/90 active:scale-95 disabled:opacity-40"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add link
          </button>
        </div>
      </section>

      {/* Responses */}
      <section className="rounded-3xl bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-brand" />
            <h2 className="text-sm font-extrabold text-ink">Responses</h2>
          </div>
          <button
            type="button"
            onClick={pdf}
            disabled={pdfBusy}
            className="flex h-10 items-center gap-1.5 rounded-2xl bg-brand px-4 text-xs font-bold text-white shadow-pop transition hover:bg-brand-deep active:scale-95 disabled:opacity-50"
          >
            <DownloadIcon className="h-4 w-4" />
            {pdfBusy ? "Preparing…" : "Download PDF"}
          </button>
        </div>

        {detail.links.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-full px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
                filter === "all"
                  ? "bg-ink text-white"
                  : "bg-cream text-ink-soft ring-1 ring-line hover:text-ink"
              }`}
            >
              All groups
            </button>
            {detail.links.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setFilter(l.id)}
                className={`rounded-full px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
                  filter === l.id
                    ? "bg-ink text-white"
                    : "bg-cream text-ink-soft ring-1 ring-line hover:text-ink"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-cream/70 px-4 py-6 text-center text-sm font-medium text-ink-soft">
            No responses {filter === "all" ? "yet" : "from this group yet"}. Share the
            link and they&rsquo;ll appear here.
          </p>
        ) : (
          <>
            {/* Ranked slots */}
            <h3 className="mt-5 text-xs font-extrabold uppercase tracking-wider text-ink-faint">
              Best times
            </h3>
            <ul className="mt-2 space-y-2">
              {ranked.map(({ slot, names }) => (
                <li
                  key={slot.id}
                  className={`rounded-2xl border p-3 ${
                    maxVotes > 0 && names.length === maxVotes
                      ? "border-brand/40 bg-brand-faint"
                      : "border-line bg-cream/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-ink">
                      {fmtDate(slot.date)}
                      <span className="font-semibold text-ink-soft">
                        {" "}
                        · {fmtRange(slot.start, slot.end)}
                      </span>
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                        names.length > 0
                          ? "bg-brand text-white"
                          : "bg-line/60 text-ink-faint"
                      }`}
                    >
                      {names.length} {names.length === 1 ? "vote" : "votes"}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/70">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{
                        width: maxVotes ? `${(names.length / maxVotes) * 100}%` : "0%",
                      }}
                    />
                  </div>
                  {names.length > 0 && (
                    <p className="mt-2 text-xs font-semibold text-ink-soft">
                      {names.join(", ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            {/* Individual responses */}
            <h3 className="mt-6 text-xs font-extrabold uppercase tracking-wider text-ink-faint">
              Individual responses
            </h3>
            <ul className="mt-2 divide-y divide-line">
              {filtered.map((r) => (
                <li key={r.id} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-extrabold text-brand-deep">
                    {r.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink">
                      {r.name}
                      <span className="ml-2 rounded-full bg-cream px-2 py-0.5 text-[10px] font-bold text-ink-faint ring-1 ring-line">
                        {r.linkLabel}
                      </span>
                    </p>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-ink-soft">
                      {r.slotIds
                        .map((id) => detail.slots.find((s) => s.id === id))
                        .filter((s): s is NonNullable<typeof s> => Boolean(s))
                        .map((s) => `${fmtDate(s.date)} ${fmtRange(s.start, s.end)}`)
                        .join(" · ")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
