import { NextRequest, NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { collections } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import type { Slot } from "@/lib/types";

const slotId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);
const linkToken = customAlphabet(
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789",
  12
);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    name?: string;
    note?: string;
    slots?: { date: string; start: string; end: string }[];
    firstLinkLabel?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const name = (body.name || "").trim();
  const note = (body.note || "").trim();
  const rawSlots = Array.isArray(body.slots) ? body.slots : [];

  if (!name) {
    return NextResponse.json({ error: "Event name is required" }, { status: 400 });
  }
  if (rawSlots.length === 0) {
    return NextResponse.json(
      { error: "Add at least one date with a time slot" },
      { status: 400 }
    );
  }
  for (const s of rawSlots) {
    if (!DATE_RE.test(s.date) || !TIME_RE.test(s.start) || !TIME_RE.test(s.end)) {
      return NextResponse.json({ error: "Invalid slot format" }, { status: 400 });
    }
    if (s.end <= s.start) {
      return NextResponse.json(
        { error: `End time must be after start time (${s.date})` },
        { status: 400 }
      );
    }
  }

  const slots: Slot[] = rawSlots
    .map((s) => ({ id: slotId(), date: s.date, start: s.start, end: s.end }))
    .sort((a, b) =>
      a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date)
    );

  const { events, links } = await collections();
  const result = await events.insertOne({
    name,
    ...(note ? { note } : {}),
    slots,
    createdAt: new Date(),
  });

  // Every event starts with one share link so the admin can share right away.
  const label = (body.firstLinkLabel || "").trim() || "General";
  await links.insertOne({
    eventId: result.insertedId,
    label,
    token: linkToken(),
    createdAt: new Date(),
  });

  return NextResponse.json({ id: result.insertedId.toString() });
}
