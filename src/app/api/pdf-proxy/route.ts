import { NextRequest } from "next/server";

const ALLOWED_HOST = "www.indiags.com";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return new Response("Missing url parameter", { status: 400 });
  }

  // Security: only proxy from the known host
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  if (parsed.hostname !== ALLOWED_HOST) {
    return new Response("Host not allowed", { status: 403 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Referer: "https://www.indiags.com/epaper-pdf-download",
      },
    });

    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.status}`, {
        status: upstream.status,
      });
    }

    const contentType = upstream.headers.get("content-type") ?? "application/pdf";
    const body = await upstream.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "public, max-age=3600",
        // Allow iframe/embed in same origin
        "Content-Disposition": "inline",
      },
    });
  } catch (err) {
    console.error("[pdf-proxy]", err);
    return new Response("Proxy error", { status: 502 });
  }
}
