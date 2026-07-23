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

  let body: { add?: RawSlot[]; removeIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const rawAdds = Array.isArray(body.add) ? body.add : [];
  const rawRemoveIds = Array.isArray(body.removeIds)
    ? body.removeIds.filter((r) => typeof r === "string")
    : [];
  if (rawAdds.length === 0 && rawRemoveIds.length === 0) {
    return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
  }
  const invalid = invalidSlotInput(rawAdds);
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  const { events, responses } = await collections();
  const event = await events.findOne({ _id: eventId });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existingIds = new Set(event.slots.map((s) => s.id));
  const removeIds = rawRemoveIds.filter((r) => existingIds.has(r));
  const kept = event.slots.filter((s) => !removeIds.includes(s.id));

  // Skip adds that duplicate a kept slot (same date + start + end) or each other.
  const seen = new Set(kept.map((s) => `${s.date}|${s.start}|${s.end}`));
  const fresh: Slot[] = [];
  for (const s of rawAdds) {
    const key = `${s.date}|${s.start}|${s.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push({ id: slotId(), date: s.date, start: s.start, end: s.end });
  }

  if (fresh.length === 0 && removeIds.length === 0) {
    return NextResponse.json(
      { error: "Those dates & times are already offered" },
      { status: 400 }
    );
  }

  const merged = [...kept, ...fresh].sort((a, b) =>
    a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date)
  );
  if (merged.length === 0) {
    return NextResponse.json(
      { error: "An event needs at least one slot — delete the event instead" },
      { status: 400 }
    );
  }

  await events.updateOne({ _id: eventId }, { $set: { slots: merged } });

  // Bookings on removed slots are cancelled; responses left with no slots go away.
  if (removeIds.length > 0) {
    await responses.updateMany(
      { eventId },
      { $pull: { slotIds: { $in: removeIds } } }
    );
    await responses.deleteMany({ eventId, slotIds: { $size: 0 } });
  }

  return NextResponse.json({ added: fresh.length, removed: removeIds.length });
}
