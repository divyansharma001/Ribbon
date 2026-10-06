import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getPublicStats } from "@/lib/profile/data";

// Inter (SIL Open Font License, see assets/fonts). Read once, used for every image.
const fonts = Promise.all(
  [400, 700].map(async (weight) => ({
    name: "Inter",
    data: await readFile(join(process.cwd(), `assets/fonts/inter-latin-${weight}-normal.woff`)),
    weight: weight as 400 | 700,
    style: "normal" as const,
  })),
);

const W = 1200;
const H = 630;

/** A share image (1200×630), used for link previews and as a download. */
export async function GET(request: NextRequest, ctx: RouteContext<"/u/[handle]/card.png">) {
  const { handle } = await ctx.params;
  const s = await getPublicStats(handle);
  if (!s) return new Response("Not found", { status: 404 });
  const earned = s.badges.filter((b) => b.earned);
  const stats: [string, string][] = [
    ["Streak", `${s.currentStreak} ${s.currentStreak === 1 ? "day" : "days"}`],
    ["Chapters", s.book ? `${s.book.chaptersDone} / ${s.book.chapters}` : "0"],
    ["Accuracy", s.answered ? `${Math.round(s.accuracy * 100)}%` : "–"],
    ["Reading", `${s.hoursRead}h`],
  ];
  const download = request.nextUrl.searchParams.has("download");

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "64px 72px",
        background: "#141312",
        color: "#e9e5dd",
        fontFamily: "Inter",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="30" height="42" viewBox="0 0 12 17" role="img" aria-label="Ribbon">
            <path d="M0 0h12v17l-6-4.4L0 17z" fill="#e2737c" />
          </svg>
          <span style={{ fontSize: 34, fontWeight: 700, color: "#e2737c", letterSpacing: 2 }}>
            RIBBON
          </span>
        </div>
        <span style={{ fontSize: 30, color: "#a39d92" }}>{s.displayName}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: 56 }}>
        <span style={{ fontSize: 30, color: "#a39d92" }}>
          Level {s.level.index + 1} · {s.level.xp.toLocaleString("en-US")} XP
        </span>
        <span style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.1 }}>{s.level.name}</span>
        <div
          style={{
            display: "flex",
            width: "100%",
            height: 14,
            marginTop: 24,
            borderRadius: 7,
            background: "#302d29",
          }}
        >
          <div
            style={{
              width: `${Math.max(2, Math.round(s.level.progress * 100))}%`,
              height: 14,
              borderRadius: 7,
              background: "#e2737c",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", marginTop: 48, gap: 24 }}>
        {stats.map(([label, value]) => (
          <div
            key={label}
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              padding: "20px 24px",
              borderRadius: 20,
              background: "#24221f",
            }}
          >
            <span style={{ fontSize: 24, color: "#a39d92" }}>{label}</span>
            <span style={{ fontSize: 44, fontWeight: 700 }}>{value}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          marginTop: "auto",
          justifyContent: "space-between",
          fontSize: 26,
          color: "#a39d92",
        }}
      >
        <span>
          {earned.length} {earned.length === 1 ? "badge" : "badges"} earned
        </span>
        <span>{s.book?.title ?? ""}</span>
      </div>
    </div>,
    {
      width: W,
      height: H,
      fonts: await fonts,
      headers: {
        "Cache-Control": "no-cache, max-age=0",
        ...(download
          ? { "Content-Disposition": `attachment; filename="ribbon-${s.handle}.png"` }
          : {}),
      },
    },
  );
}
