import Image from "next/image";
import { collections } from "@/lib/db";
import type { PublicEvent } from "@/lib/types";
import BookingClient from "@/components/BookingClient";

export const dynamic = "force-dynamic";

async function loadPublicEvent(token: string): Promise<PublicEvent | null> {
  const { events, links, responses } = await collections();
  const link = await links.findOne({ token });
  if (!link) return null;
  const event = await events.findOne({ _id: link.eventId });
  if (!event) return null;

  // A slot belongs to whoever booked it first, across every share link.
  const eventResponses = await responses
    .find({ eventId: link.eventId })
    .sort({ _id: 1 })
    .toArray();
  const taken: Record<string, string> = {};
  for (const r of eventResponses) {
    for (const id of r.slotIds) {
      if (!(id in taken)) taken[id] = r.name;
    }
  }

  return {
    name: event.name,
    note: event.note,
    linkLabel: link.label,
    slots: event.slots,
    taken,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const event = await loadPublicEvent(token);
  return {
    title: event ? `${event.name} · Quick Block` : "Quick Block",
    description: event
      ? `Pick the times that work for you for “${event.name}”.`
      : "Share your availability in a few taps.",
  };
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const event = await loadPublicEvent(token);

  if (!event) {
    return (
      <main className="qb-backdrop flex min-h-screen flex-col items-center justify-center px-6 py-10 text-center">
        <Image src="/piramal-logo.svg" alt="Piramal Finance" width={130} height={60} />
        <div className="qb-pop-in mt-8 w-full max-w-sm rounded-3xl bg-white p-8 shadow-card">
          <p className="text-5xl">🗓️</p>
          <h1 className="mt-4 text-xl font-extrabold text-ink">Link not found</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            This invite may have been removed. Ask the organiser for a fresh link.
          </p>
        </div>
      </main>
    );
  }

  return <BookingClient event={event} token={token} />;
}
