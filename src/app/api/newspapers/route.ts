import { NextResponse } from "next/server";

const BASE = "https://www.indiags.com";
const SOURCE_URL = `${BASE}/epaper-pdf-download`;

// Newspapers we want, keyed by their exact card-d-s-title text
const TARGETS: { key: string; label: string }[] = [
  { key: "The Hindu International", label: "The Hindu International" },
  { key: "Indian Express", label: "Indian Express" },
];

/** Build a direct PDF URL from the raw `file=` query-param value. */
function fileToPdfUrl(raw: string): string {
  // raw = e.g. "uploads%2FIE-+Delhi+13-03.pdf"
  // Decode %2F → / (path separator), + → space (query-string convention)
  const decoded = decodeURIComponent(raw.replace(/\+/g, " "));
  // decoded = "uploads/IE- Delhi 13-03.pdf"
  const encoded = decoded.replace(/ /g, "%20");
  return `${BASE}/newspaper/${encoded}`;
}

/**
 * Parse all pdf-item cards in one pass.
 * Returns a map of { trimmedTitle → pdfUrl }.
 *
 * Each card looks like:
 *   class="card-d-s-title">
 *       Some Newspaper Name
 *   </div>
 *   ... (footer with btn-read) ...
 *   href="newspaper/ad.php?file=uploads%2F..."
 */
function parseCards(html: string): Map<string, string> {
  const result = new Map<string, string>();

  // Match each card block from card-d-s-title to the first btn-read href
  const cardRe =
    /class="card-d-s-title"[^>]*>([\s\S]*?)<\/div>[\s\S]*?href="newspaper\/(?:ad|pdf)\.php\?file=([^"]+)"/g;

  let m: RegExpExecArray | null;
  while ((m = cardRe.exec(html)) !== null) {
    const title = m[1].trim();
    const fileParam = m[2]; // still URL-encoded, e.g. uploads%2FIE-+Delhi+13-03.pdf
    result.set(title, fileToPdfUrl(fileParam));
  }

  return result;
}

export async function GET() {
  try {
    const res = await fetch(SOURCE_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 1800 }, // cache indiags.com response for 30 min
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch source" }, { status: 502 });
    }

    const html = await res.text();
    const cards = parseCards(html);

    const newspapers = TARGETS.map(({ key, label }) => {
      const pdfUrl = cards.get(key) ?? null;
      return { label, pdfUrl, available: pdfUrl !== null };
    });

    return NextResponse.json({ newspapers });
  } catch (err) {
    console.error("[newspapers API]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
