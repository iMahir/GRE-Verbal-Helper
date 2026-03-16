import { NextRequest } from "next/server";

// Extend Vercel function timeout for slow PDF conversion
export const maxDuration = 60;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";
const WEBTOPDF_BASE = "https://webtopdf.com";
const WEBTOPDF_CONVERT = `${WEBTOPDF_BASE}/Controllers/Convert.ashx`;
const COLTCLOUD = "https://coltcloud.com/transmitbinary";

// In-memory cache: essayUrl → { buffer, cachedAt }
// Persists across requests for the lifetime of the Node.js process.
const cache = new Map<string, { buffer: ArrayBuffer; cachedAt: number }>();
const CACHE_TTL = 20 * 60 * 60 * 1000; // 20 hours

async function convertEssayToPdf(essayUrl: string): Promise<ArrayBuffer> {
  // ── Step 1: Warm up session on webtopdf.com to receive cookies ──────────
  const warmRes = await fetch(WEBTOPDF_BASE, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
  });

  // Collect all Set-Cookie values into a single Cookie header string
  // Node 18+ exposes getSetCookie(); fall back to the combined header string.
  const rawCookies: string[] =
    typeof (warmRes.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === "function"
      ? (warmRes.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : (warmRes.headers.get("set-cookie") ?? "").split(/,(?=[^ ])/);

  const cookieHeader = rawCookies
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");

  // ── Step 2: Submit conversion job ────────────────────────────────────────
  const payload = {
    filepath: essayUrl,
    pagesize: "A4",
    width: "0",
    height: "0",
    landscape: "false",
    leftmargin: "12",
    topmargin: "12",
    rightmargin: "12",
    bottommargin: "14",
    htmlzoom: "100",
    header: "",
    footer: "",
    pw: "",
    permissions: "011",
    type: "PDF",
    useprintmedia: "false",
    noscript: "false",
    nolink: "false",
    pagenumber: "false",
    grayscale: "false",
    bookmark: "false",
    minloadwaittime: "8",
    wmtext: "",
    wmfonttype: "0",
    wmfontsize: "14",
    wmfontbold: "false",
    wmfontitalic: "false",
    wmfontcolor: "000000",
    wmprefixtype: "0",
    wmopacity: "100",
    wmrotationtype: "0",
    wmbkmode: "0",
    curUrl: "/",
    zipmode: "0",
    convertemode: "00",
  };

  const convRes = await fetch(WEBTOPDF_CONVERT, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/json; charset=UTF-8",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      Origin: WEBTOPDF_BASE,
      Referer: WEBTOPDF_BASE + "/",
      Cookie: cookieHeader,
    },
    body: JSON.stringify(payload),
  });

  if (!convRes.ok) throw new Error(`webtopdf conv HTTP ${convRes.status}`);

  const data = await convRes.json() as {
    status: number;
    convertedFilePath?: string;
    fileName?: string;
  };

  if (data.status !== 1 || !data.convertedFilePath || !data.fileName) {
    throw new Error(`webtopdf conversion failed: ${JSON.stringify(data)}`);
  }

  // ── Step 3: Build coltcloud download token ────────────────────────────────
  // Matches the Python: f"WTP\\{converted_path}*{filename}"
  const rawToken = `WTP\\${data.convertedFilePath}*${data.fileName}.pdf`;
  const token = Buffer.from(rawToken).toString("base64");

  // ── Step 4: Download the PDF ─────────────────────────────────────────────
  const pdfRes = await fetch(`${COLTCLOUD}/${token}`, {
    headers: {
      "User-Agent": UA,
      Referer: WEBTOPDF_BASE + "/",
    },
  });

  if (!pdfRes.ok) throw new Error(`coltcloud download HTTP ${pdfRes.status}`);

  return pdfRes.arrayBuffer();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) return new Response("Missing url param", { status: 400 });

  // Security: only convert aeon.co essay pages
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }
  if (parsed.hostname !== "aeon.co") {
    return new Response("Host not allowed", { status: 403 });
  }

  // ── Cache hit ─────────────────────────────────────────────────────────────
  const hit = cache.get(url);
  if (hit && Date.now() - hit.cachedAt < CACHE_TTL) {
    return new Response(hit.buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=72000",
        "X-Cache": "HIT",
      },
    });
  }

  // ── Convert ───────────────────────────────────────────────────────────────
  try {
    const buffer = await convertEssayToPdf(url);
    cache.set(url, { buffer, cachedAt: Date.now() });

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=72000",
        "X-Cache": "MISS",
      },
    });
  } catch (err) {
    console.error("[aeon-pdf]", err);
    return new Response(
      err instanceof Error ? err.message : "PDF conversion failed",
      { status: 502 }
    );
  }
}
