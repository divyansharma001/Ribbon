import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { listTracks } from "@/lib/music";

/** The approved playlist. */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(
    { tracks: await listTracks() },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
