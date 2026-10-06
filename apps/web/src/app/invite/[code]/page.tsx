import type { Metadata } from "next";
import Link from "next/link";
import { JoinButton } from "@/components/invites/join-button";
import { PerkList } from "@/components/invites/perks";
import { RibbonMark } from "@/components/ribbon-mark";
import { getInvite } from "@/lib/invites/data";
import { CODE } from "@/lib/invites/logic";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "You're invited" };

/** Where an invite link lands. Public: it only shows who sent it. */
export default async function InviteLanding({ params }: PageProps<"/invite/[code]">) {
  const { code } = await params;
  const [invite, session] = await Promise.all([
    CODE.test(code) ? getInvite(code) : Promise.resolve(null),
    getSession(),
  ]);

  let body: React.ReactNode;
  if (session) {
    body = (
      <>
        <h1 className="join-title">You're already in Ribbon</h1>
        <p className="home-muted">This invite stays unused for someone else.</p>
        <Link href="/" className="home-button join-button">
          Open Ribbon
        </Link>
      </>
    );
  } else if (!invite) {
    body = (
      <>
        <h1 className="join-title">This invite link doesn't work</h1>
        <p className="home-muted">Check the link, or ask your friend for a new one.</p>
      </>
    );
  } else if (invite.status !== "pending") {
    body = (
      <>
        <h1 className="join-title">
          {invite.status === "used" ? "This invite was already used" : "This invite has expired"}
        </h1>
        <p className="home-muted">Ask {invite.inviterName} for a new link.</p>
      </>
    );
  } else {
    body = (
      <>
        <p className="home-eyebrow">You're invited</p>
        <h1 className="join-title">{invite.inviterName} invited you to read with them</h1>
        <p className="join-pitch">
          Ribbon is a calm reader for <em>Designing Data-Intensive Applications</em>: it never loses
          your place, checks what you remember after each section, and keeps your streak going.
        </p>
        <PerkList />
        <JoinButton code={code} />
        <p className="set-hint">You'll confirm you own a copy of the book before reading.</p>
      </>
    );
  }

  return (
    <main className="join-main">
      <div className="home-card join-card">
        <RibbonMark className="h-9 w-[27px] text-accent" />
        {body}
      </div>
    </main>
  );
}
