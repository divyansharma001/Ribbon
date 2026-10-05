// Uploads approved music tracks from /books/music to the private Blob store (folder "music/").
// Tracks must be licensed for use in an app (e.g. the Pixabay Content License). Never commit them.
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { list, put } from "@vercel/blob";
import { config } from "dotenv";

const repoRoot = resolve(import.meta.dirname, "../../..");
config({ path: join(repoRoot, ".env"), quiet: true });

const AUDIO = /^[\w.-]+\.(mp3|m4a|ogg|opus)$/i;
const TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  opus: "audio/ogg",
};

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.log(
    "BLOB_READ_WRITE_TOKEN is not set. Local development plays tracks straight from books/music.",
  );
  process.exit(0);
}

const dir = join(repoRoot, "books", "music");
const files = (await readdir(dir).catch(() => [])).filter((f) => AUDIO.test(f)).sort();
const existing = new Map(
  (await list({ prefix: "music/", token })).blobs.map((b) => [b.pathname, b.size]),
);
let uploaded = 0;
for (const name of files) {
  const data = await readFile(join(dir, name));
  if (existing.get(`music/${name}`) === data.byteLength) continue;
  const ext = name.split(".").at(-1)?.toLowerCase() ?? "mp3";
  await put(`music/${name}`, data, {
    access: "private",
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: TYPES[ext] ?? "audio/mpeg",
  });
  uploaded++;
}
console.log(
  `music: ${files.length} tracks found, ${uploaded} uploaded, ${files.length - uploaded} already there`,
);
