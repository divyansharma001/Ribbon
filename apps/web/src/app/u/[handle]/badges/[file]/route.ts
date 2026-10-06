import type { NextRequest } from "next/server";
import { badgeFor, smallBadgeSvg } from "@/lib/profile/card";
import { getPublicStats } from "@/lib/profile/data";
import { freshImage } from "@/lib/profile/http";

/** A small badge, e.g. /u/me/badges/streak.svg. Only badges the reader has earned. */
export async function GET(request: NextRequest, ctx: RouteContext<"/u/[handle]/badges/[file]">) {
  const { handle, file } = await ctx.params;
  const id = file.endsWith(".svg") ? file.slice(0, -4) : null;
  const stats = id ? await getPublicStats(handle) : null;
  const badge = stats && id ? badgeFor(stats, id) : null;
  if (!badge) return new Response("Not found", { status: 404 });
  return freshImage(
    smallBadgeSvg(badge.message, badge.color),
    "image/svg+xml; charset=utf-8",
    request,
  );
}
