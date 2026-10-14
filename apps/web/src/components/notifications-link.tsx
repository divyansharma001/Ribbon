import Link from "next/link";

/** Bell button in the top bar, to the notifications page, with the unread count. */
export function NotificationsLink({ unread }: { unread: number }) {
  return (
    <Link
      href="/notifications"
      className="relative flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-text"
      aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {unread > 0 && (
        <span className="notif-count" aria-hidden="true">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
