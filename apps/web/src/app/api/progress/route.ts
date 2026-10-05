import { and, eq, inArray, schema, sql } from "@ribbon/db";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEVICE_ID_PATTERN } from "@/lib/reading/device-cookie";

const id = z.string().min(1).max(200);
const isoTime = z.iso.datetime({ offset: true });

const Body = z.object({
  bookId: id,
  chapterId: id,
  device: z.object({ id: z.string().regex(DEVICE_ID_PATTERN), label: z.string().min(1).max(60) }),
  position: z
    .object({
      blockId: id,
      blockHash: z.string().length(8),
      offset: z.number().min(0).max(1),
      readAt: isoTime,
    })
    .optional(),
  session: z
    .object({
      id: z.uuid(),
      startedAt: isoTime,
      endedAt: isoTime,
      startBlockId: id,
      endBlockId: id,
      // Whole seconds in the database; a fractional value from the browser is rounded, not rejected.
      activeSeconds: z.number().min(0).max(86_400).transform(Math.round),
    })
    .optional(),
  reads: z.array(id).max(500).default([]),
});

/** Clock skew we accept from a device. Anything further in the future is rejected. */
const MAX_FUTURE_MS = 5 * 60 * 1000;

/**
 * Saves reading progress. A route handler (not a server action) so the
 * browser can also send it with keepalive / sendBeacon when the page closes.
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(JSON.parse(await request.text()));
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const now = Date.now();
  const times = [body.position?.readAt, body.session?.startedAt, body.session?.endedAt].filter(
    (t): t is string => t !== undefined,
  );
  if (times.some((t) => Date.parse(t) > now + MAX_FUTURE_MS)) {
    return Response.json({ error: "time in the future" }, { status: 400 });
  }
  if (body.session && Date.parse(body.session.endedAt) < Date.parse(body.session.startedAt)) {
    return Response.json({ error: "session ends before it starts" }, { status: 400 });
  }

  // Only accept blocks that really are in this chapter of this book.
  const wanted = [
    ...new Set([
      ...(body.position ? [body.position.blockId] : []),
      ...(body.session ? [body.session.startBlockId, body.session.endBlockId] : []),
      ...body.reads,
    ]),
  ];
  const found = wanted.length
    ? await db
        .select({ id: schema.blocks.id })
        .from(schema.blocks)
        .where(
          and(
            eq(schema.blocks.bookId, body.bookId),
            eq(schema.blocks.chapterId, body.chapterId),
            inArray(schema.blocks.id, wanted),
          ),
        )
    : [];
  const valid = new Set(found.map((b) => b.id));
  if (body.position && !valid.has(body.position.blockId)) {
    return Response.json({ error: "unknown block" }, { status: 400 });
  }

  const userId = session.user.id;
  await db.transaction(async (tx) => {
    if (body.position) {
      const row = {
        userId,
        bookId: body.bookId,
        deviceId: body.device.id,
        deviceLabel: body.device.label,
        chapterId: body.chapterId,
        blockId: body.position.blockId,
        blockHash: body.position.blockHash,
        offset: body.position.offset,
        readAt: new Date(body.position.readAt),
        updatedAt: new Date(),
      };
      const t = schema.readingPositions;
      // Never move a device's position back in time (late or out-of-order requests).
      await tx
        .insert(t)
        .values(row)
        .onConflictDoUpdate({
          target: [t.userId, t.bookId, t.deviceId],
          set: {
            deviceLabel: row.deviceLabel,
            chapterId: row.chapterId,
            blockId: row.blockId,
            blockHash: row.blockHash,
            offset: row.offset,
            readAt: row.readAt,
            updatedAt: row.updatedAt,
          },
          setWhere: sql`${t.readAt} < excluded.read_at`,
        });
    }

    const s = body.session;
    if (s && valid.has(s.startBlockId) && valid.has(s.endBlockId)) {
      const t = schema.readingSessions;
      await tx
        .insert(t)
        .values({
          id: s.id,
          userId,
          bookId: body.bookId,
          deviceId: body.device.id,
          chapterId: body.chapterId,
          startBlockId: s.startBlockId,
          endBlockId: s.endBlockId,
          startedAt: new Date(s.startedAt),
          endedAt: new Date(s.endedAt),
          activeSeconds: s.activeSeconds,
        })
        .onConflictDoUpdate({
          target: t.id,
          set: {
            endBlockId: sql`case when excluded.ended_at >= ${t.endedAt} then excluded.end_block_id else ${t.endBlockId} end`,
            endedAt: sql`greatest(${t.endedAt}, excluded.ended_at)`,
            activeSeconds: sql`greatest(${t.activeSeconds}, excluded.active_seconds)`,
          },
          // A session id belongs to one user; never let another user touch it.
          setWhere: sql`${t.userId} = excluded.user_id`,
        });
    }

    const reads = body.reads.filter((r) => valid.has(r));
    if (reads.length) {
      await tx
        .insert(schema.blockReads)
        .values(
          reads.map((blockId) => ({
            userId,
            bookId: body.bookId,
            blockId,
            chapterId: body.chapterId,
          })),
        )
        .onConflictDoNothing();
    }
  });

  return new Response(null, { status: 204 });
}
