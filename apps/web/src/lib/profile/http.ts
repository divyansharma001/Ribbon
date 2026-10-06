import "server-only";
import { createHash } from "node:crypto";

/**
 * Headers for images shown on other sites. GitHub keeps a copy of every README
 * image; "no-cache" with an ETag makes it check back, so the card stays current.
 */
export function freshImage(body: string, contentType: string, request: Request): Response {
  const etag = `"${createHash("sha1").update(body).digest("base64url")}"`;
  const headers = {
    "Content-Type": contentType,
    "Cache-Control": "no-cache, max-age=0",
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
  };
  if (request.headers.get("if-none-match") === etag)
    return new Response(null, { status: 304, headers });
  return new Response(body, { headers });
}
