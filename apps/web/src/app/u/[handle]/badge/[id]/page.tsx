import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RibbonMark } from "@/components/ribbon-mark";
import { getPublicStats, siteUrl } from "@/lib/profile/data";
import { milestonesFor } from "@/lib/profile/milestones";

async function find(handle: string, id: string) {
  const s = await getPublicStats(handle);
  const m = s ? milestonesFor(s).find((x) => x.id === id) : undefined;
  return s && m ? { s, m } : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/u/[handle]/badge/[id]">): Promise<Metadata> {
  const { handle, id } = await params;
  const found = await find(handle, id);
  if (!found) return { title: "Not found" };
  const title = `${found.m.name} · ${found.s.displayName}`;
  return {
    title,
    description: found.m.detail,
    openGraph: {
      title,
      description: found.m.detail,
      images: [`${siteUrl()}/u/${found.s.handle}/card.png`],
    },
  };
}

/**
 * Proof page for a milestone ("Show credential" on LinkedIn). Checked live:
 * it only exists while the reader has the milestone and the profile is on.
 */
export default async function MilestoneProof({ params }: PageProps<"/u/[handle]/badge/[id]">) {
  const { handle, id } = await params;
  const found = await find(handle, id);
  if (!found) notFound();
  const { s, m } = found;
  return (
    <div className="home">
      <header className="home-bar">
        <span className="flex items-center gap-2.5">
          <RibbonMark className="h-6 w-[18px] text-accent" />
          <span className="font-serif text-lg font-semibold">Ribbon</span>
        </span>
      </header>
      <main className="home-main pub-main">
        <section className="home-card proof">
          <span className="proof-mark" aria-hidden="true">
            {m.mark}
          </span>
          <p className="home-eyebrow">Verified by Ribbon</p>
          <h1 className="proof-name">{m.name}</h1>
          <p className="proof-who">
            Earned by <strong>{s.displayName}</strong>
          </p>
          <p className="home-muted">{m.detail}</p>
          <Link href={`/u/${s.handle}`} className="ov-secondary proof-link">
            See {s.displayName}'s profile
          </Link>
        </section>
        <p className="pub-note">
          This page is checked live against {s.displayName}'s Ribbon records. Ribbon is a personal
          reading app: this is a self-tracked reading achievement, not a certification from the
          book's publisher or authors.
        </p>
      </main>
    </div>
  );
}
