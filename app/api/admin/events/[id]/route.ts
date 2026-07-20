import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
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

  const { events, links, responses } = await collections();
  await Promise.all([
    events.deleteOne({ _id: eventId }),
    links.deleteMany({ eventId }),
    responses.deleteMany({ eventId }),
  ]);

  return NextResponse.json({ ok: true });
}
