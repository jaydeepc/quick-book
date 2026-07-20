import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { invalidSlotInput, slotId, type RawSlot } from "@/lib/slotInput";
import type { Slot } from "@/lib/types";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  let eventId: ObjectId;
  try {
    eventId = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { slots?: RawSlot[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const rawSlots = Array.isArray(body.slots) ? body.slots : [];
  if (rawSlots.length === 0) {
    return NextResponse.json({ error: "Nothing to add" }, { status: 400 });
  }
  const invalid = invalidSlotInput(rawSlots);
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  const { events } = await collections();
  const event = await events.findOne({ _id: eventId });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Skip anything already offered (same date + start + end), and payload dupes.
  const seen = new Set(event.slots.map((s) => `${s.date}|${s.start}|${s.end}`));
  const fresh: Slot[] = [];
  for (const s of rawSlots) {
    const key = `${s.date}|${s.start}|${s.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push({ id: slotId(), date: s.date, start: s.start, end: s.end });
  }
  if (fresh.length === 0) {
    return NextResponse.json(
      { error: "Those dates & times are already offered" },
      { status: 400 }
    );
  }

  const merged = [...event.slots, ...fresh].sort((a, b) =>
    a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date)
  );
  await events.updateOne({ _id: eventId }, { $set: { slots: merged } });

  return NextResponse.json({ added: fresh.length });
}
