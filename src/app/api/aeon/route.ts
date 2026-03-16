import { NextResponse } from "next/server";

const ESSAY_RSS = "https://aeon.co/essays/feed.rss";
const PODCAST_RSS = "https://feeds.transistor.fm/aeon";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";

function first(xml: string, tag: string): string {
  // Handles both plain and CDATA variants
  return (
    xml.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`))?.[1] ??
    xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1] ??
    ""
  ).trim();
}

function parseEssayRss(xml: string) {
  // Collect all <item> blocks, find the newest by pubDate
  const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  let latest = { title: "", url: "", date: "", description: "" };
  let latestMs = 0;

  for (const b of blocks) {
    const pubDate = first(b, "pubDate");
    const ms = pubDate ? new Date(pubDate).getTime() : 0;
    if (ms <= latestMs) continue;
    latestMs = ms;

    const rawLink = first(b, "link") || first(b, "guid");
    const desc = first(b, "description").replace(/<[^>]+>/g, "").slice(0, 240);

    latest = {
      title: first(b, "title"),
      url: rawLink.split("?")[0],
      date: pubDate ? new Date(pubDate).toISOString() : "",
      description: desc,
    };
  }

  return latestMs > 0 ? latest : null;
}

function parsePodcastRss(xml: string) {
  const item = xml.match(/<item>([\s\S]*?)<\/item>/)?.[1];
  if (!item) return null;

  const title = first(item, "title") || "Aeon Podcast";
  const mp3Url =
    item.match(/<enclosure[^>]+url="([^"]+)"/)?.[1] ?? "";
  const duration = item.match(/<itunes:duration>([^<]+)<\/itunes:duration>/)?.[1] ?? "";

  return { title, mp3Url, duration };
}

export async function GET() {
  try {
    const [essayRes, podcastRes] = await Promise.all([
      fetch(ESSAY_RSS, { headers: { "User-Agent": UA }, next: { revalidate: 3600 } }),
      fetch(PODCAST_RSS, { headers: { "User-Agent": UA }, next: { revalidate: 3600 } }),
    ]);

    const [essayXml, podcastXml] = await Promise.all([
      essayRes.text(),
      podcastRes.text(),
    ]);

    return NextResponse.json({
      essay: parseEssayRss(essayXml),
      podcast: parsePodcastRss(podcastXml),
    });
  } catch (err) {
    console.error("[aeon API]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
