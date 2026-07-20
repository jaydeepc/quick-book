import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { linkToken } from "@/lib/slotInput";

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

  let label = "";
  try {
    const body = await req.json();
    label = typeof body.label === "string" ? body.label.trim() : "";
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!label) {
    return NextResponse.json({ error: "Group name is required" }, { status: 400 });
  }

  const { events, links } = await collections();
  const event = await events.findOne({ _id: eventId });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = linkToken();
  await links.insertOne({ eventId, label, token, createdAt: new Date() });

  return NextResponse.json({ token, label });
}
