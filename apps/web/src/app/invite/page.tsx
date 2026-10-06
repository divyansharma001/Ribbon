import type { Metadata } from "next";
import Link from "next/link";
import { InviteManager } from "@/components/invites/invite-manager";
import { PerkList } from "@/components/invites/perks";
import { RibbonMark } from "@/components/ribbon-mark";
import { SettingsLink } from "@/components/settings-link";
import { getInvitesLeft, listInvites } from "@/lib/invites/data";
import { siteUrl } from "@/lib/profile/data";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Invite friends" };

export default async function InvitePage() {
  const user = await requireUser();
  const [invites, left] = await Promise.all([
    listInvites(user.id),
    getInvitesLeft(user.id, user.email),
  ]);
  return (
    <div className="home">
      <header className="home-bar">
        <Link href="/" className="flex items-center gap-2.5">
          <RibbonMark className="h-6 w-[18px] text-accent" />
          <span className="font-serif text-lg font-semibold">Ribbon</span>
        </Link>
        <SettingsLink />
      </header>
      <main className="home-main set-main">
        <nav aria-label="Breadcrumb" className="ov-crumbs">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span>Invite friends</span>
        </nav>
        <div>
          <h1 className="set-title">Invite friends</h1>
          <p className="home-muted lb-intro">
            Read together. You both get rewarded as your friend makes progress.
          </p>
        </div>

        <section className="home-card set-section" aria-labelledby="perks-title">
          <h2 id="perks-title" className="home-section-title">
            What you both get
          </h2>
          <PerkList />
        </section>

        <section className="home-card set-section" aria-labelledby="links-title">
          <h2 id="links-title" className="home-section-title">
            Your invite links
          </h2>
          <InviteManager invites={invites} left={left} site={siteUrl()} />
          <p className="set-hint">
            Friends confirm they own the book before reading it. In your friends league, you see
            each other's weekly XP and streak.
          </p>
        </section>
      </main>
    </div>
  );
}
