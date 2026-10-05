import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { figureStoragePath } from "@ribbon/book-schema";
import { get } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const NAME = /^[\w-]+\.png$/;
const BOOK = /^[\w-]+$/;
// Figures never change for a loaded book. Keep them in this browser only, never in a shared cache.
const CACHE = "private, max-age=86400";

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/books/[bookId]/figures/[name]">,
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { bookId, name } = await ctx.params;
  if (!BOOK.test(bookId) || !NAME.test(name)) return new Response("Not found", { status: 404 });
  const path = figureStoragePath(bookId, `figures/${name}`);

  if (process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN) {
    const ifNoneMatch = request.headers.get("if-none-match") ?? undefined;
    const result = await get(path, { access: "private", ...(ifNoneMatch ? { ifNoneMatch } : {}) });
    if (!result) return new Response("Not found", { status: 404 });
    const etag = result.headers.get("etag");
    const headers = { "Cache-Control": CACHE, ...(etag ? { ETag: etag } : {}) };
    if (result.statusCode === 304) return new Response(null, { status: 304, headers });
    return new Response(result.stream, { headers: { ...headers, "Content-Type": "image/png" } });
  }

  // Local development without Blob: read the ingest output from the repo.
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(join(process.cwd(), "../../content", path.replace(/^books\//, "")));
    return new Response(data, { headers: { "Content-Type": "image/png", "Cache-Control": CACHE } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
