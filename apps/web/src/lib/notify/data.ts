import "server-only";
import { and, count, desc, eq, isNull, schema } from "@ribbon/db";
import { cache } from "react";
import { db } from "../db";
import type { Badge, Level } from "../learning/logic";

export type NotificationKind = (typeof schema.notifications.$inferSelect)["kind"];

export interface NewNotification {
  kind: NotificationKind;
  /** Unique per reader; a second notification with the same key is dropped. */
  key: string;
  title: string;
  body: string;
  href?: string;
}

/** Adds notifications. Returns the keys actually added (repeats are skipped). */
export async function notify(userId: string, items: NewNotification[]): Promise<string[]> {
  if (items.length === 0) return [];
  const rows = await db
    .insert(schema.notifications)
    .values(
      items.map((n) => ({
        id: crypto.randomUUID(),
        userId,
        kind: n.kind,
        key: n.key,
        title: n.title,
        body: n.body,
        href: n.href ?? null,
      })),
    )
    .onConflictDoNothing()
    .returning({ key: schema.notifications.key });
  return rows.map((r) => r.key);
}

/** Takes back a notification, e.g. a reminder whose email could not be sent, so it can be tried again. */
export async function unnotify(userId: string, key: string): Promise<void> {
  await db
    .delete(schema.notifications)
    .where(and(eq(schema.notifications.userId, userId), eq(schema.notifications.key, key)));
}

export interface NotificationView {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  createdAt: Date;
  unread: boolean;
}

export async function listNotifications(userId: string, limit = 50): Promise<NotificationView[]> {
  const rows = await db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, userId))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    href: r.href,
    createdAt: r.createdAt,
    unread: r.readAt === null,
  }));
}

export const getUnreadCount = cache(async (userId: string): Promise<number> => {
  const [row] = await db
    .select({ n: count() })
    .from(schema.notifications)
    .where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt)));
  return row?.n ?? 0;
});

export async function markAllRead(userId: string): Promise<void> {
  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt)));
}

/** Notes newly earned badges and levels, once each. Safe to call on every Home view. */
export async function notifyMilestones(
  userId: string,
  badges: readonly Badge[],
  level: Level,
): Promise<void> {
  const items: NewNotification[] = badges
    .filter((b) => b.earned)
    .map((b) => ({
      kind: "badge",
      key: `badge:${b.id}`,
      title: `You earned the ${b.name} badge`,
      body: b.how,
      href: "/#badges-title",
    }));
  if (level.index > 0) {
    items.push({
      kind: "level",
      key: `level:${level.index}`,
      title: `You reached level ${level.index + 1}: ${level.name}`,
      body:
        level.to === null ? "That's the top level." : `The next level starts at ${level.to} XP.`,
      href: "/#level-title",
    });
  }
  await notify(userId, items);
}
