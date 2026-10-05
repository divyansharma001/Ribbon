import "server-only";
import { and, desc, eq, schema } from "@ribbon/db";
import { cookies } from "next/headers";
import { db } from "../db";
import { DEVICE_COOKIE, DEVICE_ID_PATTERN } from "./device-cookie";
import { type DevicePosition, otherDeviceSpot } from "./logic";

export interface ResumeState {
  deviceId: string | null;
  /** This device's own last spot in the book. */
  thisDevice: DevicePosition | null;
  /** A more recent spot from another device, worth offering. */
  otherDevice: (DevicePosition & { chapterTitle: string; sectionTitle: string }) | null;
}

/** Where this reader was, on this device and on others. */
export async function getResumeState(userId: string, bookId: string): Promise<ResumeState> {
  const raw = (await cookies()).get(DEVICE_COOKIE)?.value ?? null;
  const deviceId = raw && DEVICE_ID_PATTERN.test(raw) ? raw : null;

  const rows = await db
    .select()
    .from(schema.readingPositions)
    .where(
      and(eq(schema.readingPositions.userId, userId), eq(schema.readingPositions.bookId, bookId)),
    )
    .orderBy(desc(schema.readingPositions.readAt));
  const all: DevicePosition[] = rows.map((r) => ({
    deviceId: r.deviceId,
    deviceLabel: r.deviceLabel,
    chapterId: r.chapterId,
    blockId: r.blockId,
    blockHash: r.blockHash,
    offset: r.offset,
    readAt: r.readAt.toISOString(),
  }));
  const thisDevice = all.find((p) => p.deviceId === deviceId) ?? null;
  const other = otherDeviceSpot(thisDevice, all[0] ?? null, deviceId);
  if (!other) return { deviceId, thisDevice, otherDevice: null };

  const [where] = await db
    .select({
      section: schema.blocks.sectionAnchor,
      outline: schema.chapters.outline,
      title: schema.chapters.title,
    })
    .from(schema.blocks)
    .innerJoin(
      schema.chapters,
      and(
        eq(schema.chapters.bookId, schema.blocks.bookId),
        eq(schema.chapters.id, schema.blocks.chapterId),
      ),
    )
    .where(and(eq(schema.blocks.bookId, bookId), eq(schema.blocks.id, other.blockId)));
  const chapterTitle = where?.title ?? "";
  const sectionTitle = (where && findSectionTitle(where.outline, where.section)) ?? chapterTitle;
  return { deviceId, thisDevice, otherDevice: { ...other, chapterTitle, sectionTitle } };
}

function findSectionTitle(
  outline: { anchor: string; title: string; children: unknown[] }[],
  anchor: string,
): string | null {
  for (const node of outline) {
    if (node.anchor === anchor) return node.title;
    const inner = findSectionTitle(node.children as typeof outline, anchor);
    if (inner) return inner;
  }
  return null;
}
