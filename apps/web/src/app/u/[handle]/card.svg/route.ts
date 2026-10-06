import type { NextRequest } from "next/server";
import { profileCardSvg } from "@/lib/profile/card";
import { getPublicStats } from "@/lib/profile/data";
import { freshImage } from "@/lib/profile/http";

/** The README card. `?theme=dark` for dark backgrounds. */
export async function GET(request: NextRequest, ctx: RouteContext<"/u/[handle]/card.svg">) {
  const { handle } = await ctx.params;
  const stats = await getPublicStats(handle);
  if (!stats) return new Response("Not found", { status: 404 });
  const theme = request.nextUrl.searchParams.get("theme") === "dark" ? "dark" : "light";
  return freshImage(profileCardSvg(stats, theme), "image/svg+xml; charset=utf-8", request);
}
