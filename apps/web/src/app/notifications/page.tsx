import type { Metadata, Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { FlameIcon } from "@/components/home/streak-parts";
import { RibbonMark } from "@/components/ribbon-mark";
import { listNotifications, markAllRead, type NotificationKind } from "@/lib/notify/data";
import { timeAgo } from "@/lib/reading/logic";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Notifications" };

const stroke = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const ICONS: Record<NotificationKind, ReactNode> = {
  reminder: <FlameIcon className="notif-flame" />,
  "friend-joined": (
    <svg {...stroke} aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <path d="M17 8v6M14 11h6" />
    </svg>
  ),
  perk: (
    <svg {...stroke} aria-hidden="true">
      <rect x="3.5" y="8.5" width="17" height="12" rx="1.5" />
      <path d="M12 8.5v12M3.5 12.5h17" />
      <path d="M12 8.5S10.5 4 8 4.5 7 8.5 12 8.5zM12 8.5s1.5-4.5 4-4 1 4-4 4z" />
    </svg>
  ),
  badge: (
    <svg {...stroke} aria-hidden="true">
      <circle cx="12" cy="9" r="5.5" />
      <path d="M8.5 13.5 7 21l5-2.5 5 2.5-1.5-7.5" />
    </svg>
  ),
  level: (
    <svg {...stroke} aria-hidden="true">
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  ),
};

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await listNotifications(user.id);
  // Seen now. The list above keeps its "new" marks for this view.
  await markAllRead(user.id);

  return (
    <div className="home">
      <header className="home-bar">
        <Link href="/" className="flex items-center gap-2.5">
          <RibbonMark className="h-6 w-[18px] text-accent" />
          <span className="font-serif text-lg font-semibold">Ribbon</span>
        </Link>
      </header>

      <main className="home-main set-main">
        <nav aria-label="Breadcrumb" className="ov-crumbs">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span>Notifications</span>
        </nav>
        <h1 className="set-title">Notifications</h1>

        {items.length === 0 ? (
          <section className="home-card notif-empty">
            <p className="font-medium">Nothing here yet</p>
            <p className="home-muted">
              Badges, new levels, friends joining, and your daily reminder show up here.
            </p>
            <Link href="/settings#reminder" className="ov-secondary">
              Set a daily reminder
            </Link>
          </section>
        ) : (
          <ol className="home-card notif-list">
            {items.map((n) => {
              const inner = (
                <>
                  <span className="notif-icon" data-kind={n.kind}>
                    {ICONS[n.kind]}
                  </span>
                  <span className="notif-text">
                    <span className="notif-title">{n.title}</span>
                    <span className="home-muted">{n.body}</span>
                  </span>
                  <span className="notif-when">
                    {n.unread && <span className="notif-new">New</span>}
                    <time dateTime={n.createdAt.toISOString()}>
                      {timeAgo(n.createdAt.toISOString())}
                    </time>
                  </span>
                </>
              );
              return (
                <li key={n.id}>
                  {n.href ? (
                    <Link href={n.href as Route} className="notif-item">
                      {inner}
                    </Link>
                  ) : (
                    <div className="notif-item">{inner}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </div>
  );
}
