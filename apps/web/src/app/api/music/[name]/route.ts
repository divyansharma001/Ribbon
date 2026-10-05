import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { get } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  blobConfigured,
  contentType,
  LOCAL_MUSIC_DIR,
  MUSIC_NAME,
  MUSIC_PREFIX,
} from "@/lib/music";

/** Streams one track to a signed-in reader. Supports byte ranges so the player can seek. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/music/[name]">) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });
  const { name } = await ctx.params;
  if (!MUSIC_NAME.test(name)) return new Response("Not found", { status: 404 });
  const type = contentType(name);
  const range = request.headers.get("range");

  if (blobConfigured()) {
    const result = await get(`${MUSIC_PREFIX}${name}`, {
      access: "private",
      ...(range ? { headers: { range } } : {}),
    });
    if (!result?.stream) return new Response("Not found", { status: 404 });
    const headers = new Headers({ "Content-Type": type, "Cache-Control": "private, max-age=3600" });
    for (const h of ["content-length", "content-range", "accept-ranges"]) {
      const v = result.headers.get(h);
      if (v) headers.set(h, v);
    }
    return new Response(result.stream, {
      status: result.headers.get("content-range") ? 206 : 200,
      headers,
    });
  }

  // Local development: serve from /books/music.
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  const path = join(LOCAL_MUSIC_DIR, name);
  const info = await stat(path).catch(() => null);
  if (!info) return new Response("Not found", { status: 404 });
  const data = await readFile(path);
  const match = range ? /bytes=(\d*)-(\d*)/.exec(range) : null;
  if (match) {
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
    return new Response(data.subarray(start, end + 1), {
      status: 206,
      headers: {
        "Content-Type": type,
        "Content-Range": `bytes ${start}-${end}/${info.size}`,
        "Content-Length": String(end - start + 1),
        "Accept-Ranges": "bytes",
      },
    });
  }
  return new Response(data, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(info.size),
      "Accept-Ranges": "bytes",
    },
  });
}
