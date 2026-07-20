import Link from "next/link";
import { collections } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import type { EventSummary } from "@/lib/types";
import { PlusIcon, CalendarIcon, UsersIcon, LinkIcon, ChevronRightIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

async function loadEvents(): Promise<EventSummary[]> {
  const { events, links, responses } = await collections();
  const all = await events.find().sort({ createdAt: -1 }).toArray();
  return Promise.all(
    all.map(async (e) => {
      const [linkCount, responseCount] = await Promise.all([
        links.countDocuments({ eventId: e._id! }),
        responses.countDocuments({ eventId: e._id! }),
      ]);
      return {
        id: e._id!.toString(),
        name: e.name,
        dateCount: new Set(e.slots.map((s) => s.date)).size,
        slotCount: e.slots.length,
        linkCount,
        responseCount,
        createdAt: e.createdAt.toISOString(),
      };
    })
  );
}

export default async function AdminDashboard() {
  const events = await loadEvents();

  return (
    <div className="qb-pop-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Your events</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            {events.length === 0
              ? "Nothing here yet"
              : `${events.length} event${events.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link
          href="/admin/new"
          className="flex h-11 items-center gap-1.5 rounded-2xl bg-brand px-4 text-sm font-bold text-white shadow-pop transition hover:bg-brand-deep active:scale-95"
        >
          <PlusIcon className="h-4 w-4" />
          New event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-3xl bg-white px-6 py-10 text-center shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/empty.jpg" alt="" className="h-44 w-44 object-contain" />
          <h2 className="mt-4 text-lg font-extrabold text-ink">Create your first event</h2>
          <p className="mt-1 max-w-xs text-sm leading-relaxed text-ink-soft">
            Pick the dates and times you can offer, then share one link per group to
            collect everyone&rsquo;s availability.
          </p>
          <Link
            href="/admin/new"
            className="mt-6 flex h-12 items-center gap-2 rounded-2xl bg-brand px-6 text-sm font-bold text-white shadow-pop transition hover:bg-brand-deep active:scale-95"
          >
            <PlusIcon className="h-4 w-4" />
            Create event
          </Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {events.map((e) => (
            <li key={e.id}>
              <Link
                href={`/admin/events/${e.id}`}
                className="group flex items-center gap-4 rounded-3xl bg-white p-4 shadow-card transition hover:shadow-pop/20 sm:p-5"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-deep">
                  <CalendarIcon className="h-5.5 w-5.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-ink">
                    {e.name}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-ink-soft">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {e.dateCount} {e.dateCount === 1 ? "day" : "days"} · {e.slotCount} slots
                    </span>
                    <span className="flex items-center gap-1">
                      <LinkIcon className="h-3.5 w-3.5" />
                      {e.linkCount}
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        e.responseCount > 0 ? "text-brand-deep" : ""
                      }`}
                    >
                      <UsersIcon className="h-3.5 w-3.5" />
                      {e.responseCount}
                    </span>
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <ChevronRightIcon className="h-5 w-5 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-brand" />
                  <span className="text-[10px] font-semibold text-ink-faint">
                    {fmtDate(e.createdAt.slice(0, 10))}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
