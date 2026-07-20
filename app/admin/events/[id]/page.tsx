import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import type { EventDetail } from "@/lib/types";
import EventDetailView from "@/components/EventDetailView";

export const dynamic = "force-dynamic";

export const metadata = { title: "Event · Quick Block" };

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let eventId: ObjectId;
  try {
    eventId = new ObjectId(id);
  } catch {
    notFound();
  }

  const { events, links, responses } = await collections();
  const event = await events.findOne({ _id: eventId });
  if (!event) notFound();

  const [eventLinks, eventResponses] = await Promise.all([
    links.find({ eventId }).sort({ createdAt: 1 }).toArray(),
    responses.find({ eventId }).sort({ createdAt: -1 }).toArray(),
  ]);

  const labelByLink = new Map(eventLinks.map((l) => [l._id!.toString(), l.label]));

  const detail: EventDetail = {
    id,
    name: event.name,
    note: event.note,
    slots: event.slots,
    links: eventLinks.map((l) => ({
      id: l._id!.toString(),
      label: l.label,
      token: l.token,
      responseCount: eventResponses.filter(
        (r) => r.linkId.toString() === l._id!.toString()
      ).length,
    })),
    responses: eventResponses.map((r) => ({
      id: r._id!.toString(),
      name: r.name,
      linkId: r.linkId.toString(),
      linkLabel: labelByLink.get(r.linkId.toString()) ?? "Unknown",
      slotIds: r.slotIds,
      createdAt: r.createdAt.toISOString(),
    })),
    createdAt: event.createdAt.toISOString(),
  };

  return <EventDetailView detail={detail} />;
}
