import "server-only";

/**
 * Lofi Girl live stations. A station's video id changes whenever Lofi Girl
 * restarts that stream, so each station is matched by its title. With a
 * YOUTUBE_API_KEY set, the current ids come from the official YouTube Data
 * API (cached for 6 hours); without one, the ids below are used.
 */

export interface Station {
  id: string;
  label: string;
  videoId: string;
}

const LOFI_GIRL_CHANNEL = "UCSJ4gkVC6NrvII8umztf0Ow";

/** Ids checked live on 2026-10-05. `match` is part of the stream title. */
const STATIONS: (Station & { match: string })[] = [
  { id: "study", label: "Study", match: "lofi hip hop radio 📚", videoId: "rFZHOHl-L8A" },
  { id: "jazz", label: "Jazz", match: "jazz lofi radio", videoId: "E2vONfzoyRI" },
  { id: "piano", label: "Piano", match: "relaxing piano radio", videoId: "N0snMcR6aaA" },
  { id: "classical", label: "Classical", match: "classical music radio", videoId: "jXAEIWcGXwE" },
  { id: "rain", label: "Rainy day", match: "sad lofi radio", videoId: "CwPCy1GLS38" },
  { id: "synthwave", label: "Synthwave", match: "synthwave radio", videoId: "4xDzrJKXOOY" },
];

const CACHE_MS = 6 * 60 * 60 * 1000;
let cached: { at: number; stations: Station[] } | null = null;

const strip = ({ id, label, videoId }: Station): Station => ({ id, label, videoId });

export async function liveStations(): Promise<Station[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return STATIONS.map(strip);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.stations;
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.search = new URLSearchParams({
      part: "snippet",
      channelId: LOFI_GIRL_CHANNEL,
      eventType: "live",
      type: "video",
      maxResults: "50",
      key,
    }).toString();
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`YouTube API ${res.status}`);
    const data = (await res.json()) as {
      items?: { id?: { videoId?: string }; snippet?: { title?: string } }[];
    };
    const live = (data.items ?? []).map((i) => ({
      id: i.id?.videoId,
      title: i.snippet?.title ?? "",
    }));
    const stations = STATIONS.map((s) => {
      const hit = live.find((l) => l.id && l.title.toLowerCase().includes(s.match.toLowerCase()));
      return strip({ ...s, videoId: hit?.id ?? s.videoId });
    });
    cached = { at: Date.now(), stations };
    return stations;
  } catch {
    return STATIONS.map(strip);
  }
}
