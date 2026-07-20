import { NextRequest, NextResponse } from "next/server";
import { collections } from "@/lib/db";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;

  let body: { name?: string; slotIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const name = (body.name || "").trim().slice(0, 80);
  const slotIds = Array.isArray(body.slotIds)
    ? [...new Set(body.slotIds.filter((s) => typeof s === "string"))]
    : [];

  if (!name) {
    return NextResponse.json({ error: "Please add your name" }, { status: 400 });
  }
  if (slotIds.length === 0) {
    return NextResponse.json({ error: "Pick at least one time" }, { status: 400 });
  }

  const { events, links, responses } = await collections();
  const link = await links.findOne({ token });
  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }
  const event = await events.findOne({ _id: link.eventId });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const validIds = new Set(event.slots.map((s) => s.id));
  const chosen = slotIds.filter((s) => validIds.has(s));
  if (chosen.length === 0) {
    return NextResponse.json({ error: "Pick at least one time" }, { status: 400 });
  }

  await responses.insertOne({
    eventId: link.eventId,
    linkId: link._id!,
    name,
    slotIds: chosen,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}
