import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { liveStations } from "@/lib/live-stations";

/** Lofi Girl live stations with their current video ids. */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(
    { stations: await liveStations() },
    { headers: { "Cache-Control": "private, max-age=600" } },
  );
}
