"use client";

import { useState, useTransition } from "react";
import { CopyField } from "@/components/share/profile-form";
import { createInviteAction, revokeInviteAction } from "@/lib/invites/actions";
import type { InviteView } from "@/lib/invites/data";

const STATUS: Record<InviteView["status"], string> = {
  pending: "Waiting",
  used: "Joined",
  expired: "Expired",
  revoked: "Cancelled",
};

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000));
}

/** Create invite links, share them, and see who joined. */
export function InviteManager({
  invites,
  left,
  site,
}: {
  invites: InviteView[];
  /** Invites left, or null for no limit. */
  left: number | null;
  site: string;
}) {
  const [pending, start] = useTransition();
  const [fresh, setFresh] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const link = (code: string) => `${site}/invite/${code}`;
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  const create = () =>
    start(async () => {
      setError(null);
      const result = await createInviteAction();
      if (result.ok) setFresh(link(result.code));
      else setError("You've used all your invites. Cancel an unused one to get it back.");
    });

  return (
    <div className="invite-manager" aria-busy={pending}>
      <div className="invite-create">
        <button
          type="button"
          className="home-button invite-button"
          onClick={create}
          disabled={pending || left === 0}
        >
          {pending ? "Creating…" : "Create invite link"}
        </button>
        <span className="home-muted">
          {left === null
            ? "No limit for you."
            : `${left} ${left === 1 ? "invite" : "invites"} left.`}{" "}
          Links work once and expire in 14 days.
        </span>
      </div>
      {error && (
        <p className="share-warn" role="alert">
          {error}
        </p>
      )}
      {fresh && (
        <div className="invite-fresh">
          <CopyField label="Your new invite link" value={fresh} />
          {canShare && (
            <button
              type="button"
              className="ov-secondary"
              onClick={() =>
                navigator.share({
                  title: "Join me on Ribbon",
                  text: "I'm reading Designing Data-Intensive Applications on Ribbon. Join me:",
                  url: fresh,
                })
              }
            >
              Share…
            </button>
          )}
        </div>
      )}

      {invites.length > 0 && (
        <ul className="invite-list">
          {invites.map((i) => (
            <li key={i.id} className="invite-row" data-status={i.status}>
              <span className="invite-status">{STATUS[i.status]}</span>
              <span className="invite-what">
                {i.status === "used"
                  ? `${i.usedByName ?? "A friend"} joined`
                  : i.status === "pending"
                    ? `Expires in ${daysLeft(i.expiresAt)} ${daysLeft(i.expiresAt) === 1 ? "day" : "days"}`
                    : new Date(i.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
              </span>
              {i.status === "pending" && (
                <span className="invite-actions">
                  <button
                    type="button"
                    className="share-copy-button"
                    onClick={() => navigator.clipboard.writeText(link(i.code))}
                  >
                    Copy link
                  </button>
                  <button
                    type="button"
                    className="share-copy-button"
                    onClick={() => start(() => revokeInviteAction(i.id))}
                  >
                    Cancel
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
