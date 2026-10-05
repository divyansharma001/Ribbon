import "server-only";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { list } from "@vercel/blob";

/** Private storage folder for approved music tracks. */
export const MUSIC_PREFIX = "music/";
const AUDIO = /\.(mp3|m4a|ogg|opus)$/i;
export const MUSIC_NAME = /^[\w.-]+\.(mp3|m4a|ogg|opus)$/i;

/** Local tracks live in the git-ignored /books/music folder during development. */
export const LOCAL_MUSIC_DIR = join(process.cwd(), "../../books/music");

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

/** "night-walk_lofi.mp3" -> "Night walk lofi" */
export function trackTitle(name: string): string {
  const base = name.replace(AUDIO, "").replace(/[-_]+/g, " ").trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function contentType(name: string): string {
  const ext = name.split(".").at(-1)?.toLowerCase();
  return ext === "m4a" ? "audio/mp4" : ext === "ogg" || ext === "opus" ? "audio/ogg" : "audio/mpeg";
}

export async function listTracks(): Promise<{ name: string; title: string }[]> {
  let names: string[] = [];
  if (blobConfigured()) {
    const { blobs } = await list({ prefix: MUSIC_PREFIX });
    names = blobs.map((b) => b.pathname.slice(MUSIC_PREFIX.length));
  } else if (process.env.NODE_ENV !== "production") {
    names = await readdir(LOCAL_MUSIC_DIR).catch(() => []);
  }
  return names
    .filter((n) => MUSIC_NAME.test(n))
    .sort()
    .map((name) => ({ name, title: trackTitle(name) }));
}
