"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

// react-pdf and audio both require browser APIs — load client-only
const PdfViewer = dynamic(() => import("@/components/PdfViewer"), { ssr: false });
const AudioPlayer = dynamic(() => import("@/components/AudioPlayer"), { ssr: false });

type Tab = "newspapers" | "articles";

interface Newspaper {
  label: string;
  pdfUrl: string | null;
  available: boolean;
}

interface AeonData {
  essay: { title: string; url: string; date: string; description: string } | null;
  podcast: { title: string; mp3Url: string; duration: string } | null;
}

const NEWSPAPER_META: Record<string, { subtitle: string; icon: string }> = {
  "The Hindu International": { subtitle: "International edition", icon: "TH" },
  "Indian Express": { subtitle: "Delhi edition", icon: "IE" },
};

function ReadButton({
  onClick,
  label = "Read",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-100 text-zinc-900 text-sm font-medium min-h-[48px] min-w-[88px] justify-center hover:bg-zinc-200 active:scale-95 transition-all"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
      {label}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

export default function ReadingPage() {
  const [tab, setTab] = useState<Tab>("newspapers");

  // ── Newspapers state ─────────────────────────────────────────────────────
  const [newspapers, setNewspapers] = useState<Newspaper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(true);
  const [papersError, setPapersError] = useState<string | null>(null);

  const fetchPapers = () => {
    setLoadingPapers(true);
    setPapersError(null);
    fetch("/api/newspapers")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setNewspapers(d.newspapers);
      })
      .catch((e) => setPapersError(e.message || "Failed to load"))
      .finally(() => setLoadingPapers(false));
  };

  useEffect(() => { fetchPapers(); }, []);

  // ── Aeon state ───────────────────────────────────────────────────────────
  const [aeon, setAeon] = useState<AeonData | null>(null);
  const [loadingAeon, setLoadingAeon] = useState(false);
  const [aeonError, setAeonError] = useState<string | null>(null);
  const [aeonFetched, setAeonFetched] = useState(false);

  useEffect(() => {
    if (tab !== "articles" || aeonFetched) return;
    setLoadingAeon(true);
    setAeonError(null);
    fetch("/api/aeon")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setAeon(d);
        setAeonFetched(true);
      })
      .catch((e) => setAeonError(e.message || "Failed to load"))
      .finally(() => setLoadingAeon(false));
  }, [tab, aeonFetched]);

  // ── PDF viewer ───────────────────────────────────────────────────────────
  const [openPdf, setOpenPdf] = useState<{ url: string; title: string } | null>(null);

  const openEssayPdf = (essayUrl: string, title: string) => {
    // Pass the aeon-pdf API URL directly — PdfViewer uses it without proxying
    setOpenPdf({
      url: `/api/aeon-pdf?url=${encodeURIComponent(essayUrl)}`,
      title,
    });
  };

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 mb-1">Reading</h1>
          <p className="text-zinc-500 text-xs sm:text-sm">Daily newspapers and long-form essays</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl border border-zinc-800 mb-6 w-fit">
          {(["newspapers", "articles"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize min-h-[40px] transition-all ${
                tab === t
                  ? "bg-zinc-100 text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Newspapers tab ──────────────────────────────────────────────── */}
        {tab === "newspapers" && (
          <div>
            <p className="text-xs text-zinc-600 mb-4">Today&apos;s editions · sourced from IndiaGS</p>

            {loadingPapers && (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="card p-5 animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-zinc-800 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-zinc-800 rounded w-48" />
                        <div className="h-3 bg-zinc-800 rounded w-32" />
                      </div>
                      <div className="w-24 h-11 bg-zinc-800 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {papersError && (
              <div className="card p-5 border-red-900/40 bg-red-950/20">
                <p className="text-sm text-red-400 font-medium mb-1">Could not load newspapers</p>
                <p className="text-xs text-zinc-600">{papersError}</p>
                <button onClick={fetchPapers} className="mt-3 text-xs text-zinc-400 hover:text-zinc-200 underline">
                  Try again
                </button>
              </div>
            )}

            {!loadingPapers && !papersError && (
              <>
                <div className="space-y-3">
                  {newspapers.map((paper) => {
                    const meta = NEWSPAPER_META[paper.label] ?? {
                      subtitle: "Today's edition",
                      icon: paper.label.slice(0, 2).toUpperCase(),
                    };
                    return (
                      <div key={paper.label} className="card p-4 sm:p-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-zinc-700">
                            <span className="text-xs font-bold text-zinc-300">{meta.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-200 truncate">{paper.label}</p>
                            <p className="text-xs text-zinc-600">{meta.subtitle}</p>
                          </div>
                          {paper.available && paper.pdfUrl ? (
                            <ReadButton onClick={() => setOpenPdf({ url: paper.pdfUrl!, title: paper.label })} />
                          ) : (
                            <span className="flex-shrink-0 px-4 py-3 rounded-xl border border-zinc-800 text-zinc-600 text-sm min-h-[48px] min-w-[88px] flex items-center justify-center">
                              Unavailable
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-zinc-700 mt-5 text-center">
                  PDFs sourced from indiags.com · For personal study use only
                </p>
              </>
            )}
          </div>
        )}

        {/* ── Articles tab ────────────────────────────────────────────────── */}
        {tab === "articles" && (
          <div>
            {loadingAeon && (
              <div className="space-y-4">
                {/* Essay skeleton */}
                <div className="card p-5 animate-pulse space-y-3">
                  <div className="h-3 bg-zinc-800 rounded w-20" />
                  <div className="h-5 bg-zinc-800 rounded w-4/5" />
                  <div className="h-3 bg-zinc-800 rounded w-full" />
                  <div className="h-3 bg-zinc-800 rounded w-3/4" />
                  <div className="mt-2 h-11 bg-zinc-800 rounded-xl w-28" />
                </div>
                {/* Audio skeleton */}
                <div className="card p-5 animate-pulse space-y-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex-shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3 bg-zinc-800 rounded w-16" />
                      <div className="h-4 bg-zinc-800 rounded w-3/4" />
                    </div>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full" />
                  <div className="flex justify-between gap-3">
                    <div className="h-14 w-14 rounded-full bg-zinc-800 mx-auto" />
                  </div>
                </div>
              </div>
            )}

            {aeonError && (
              <div className="card p-5 border-red-900/40 bg-red-950/20">
                <p className="text-sm text-red-400 font-medium mb-1">Could not load Aeon content</p>
                <p className="text-xs text-zinc-600">{aeonError}</p>
                <button
                  onClick={() => { setAeonFetched(false); setAeonError(null); }}
                  className="mt-3 text-xs text-zinc-400 hover:text-zinc-200 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {!loadingAeon && !aeonError && aeon && (
              <div className="space-y-6">
                {/* ── Today's Essay ── */}
                {aeon.essay && (
                  <div>
                    <SectionLabel>Today&apos;s Essay · Aeon</SectionLabel>
                    <div className="card p-4 sm:p-5">
                      {/* Date */}
                      <p className="text-[11px] text-zinc-600 mb-2">
                        {aeon.essay.date
                          ? new Date(aeon.essay.date).toLocaleDateString("en", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })
                          : "Latest"}
                      </p>

                      {/* Title */}
                      <h2 className="text-base font-semibold text-zinc-100 mb-2 leading-snug">
                        {aeon.essay.title}
                      </h2>

                      {/* Description */}
                      {aeon.essay.description && (
                        <p className="text-sm text-zinc-500 leading-relaxed mb-4">
                          {aeon.essay.description}
                          {aeon.essay.description.length >= 240 ? "…" : ""}
                        </p>
                      )}

                      <div className="flex items-center gap-3">
                        <ReadButton
                          onClick={() => openEssayPdf(aeon.essay!.url, aeon.essay!.title)}
                          label="Read PDF"
                        />
                        <a
                          href={aeon.essay.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-zinc-600 hover:text-zinc-300 underline transition-colors"
                        >
                          Open on Aeon
                        </a>
                      </div>

                      <p className="text-[10px] text-zinc-700 mt-3">
                        PDF generated on first open · may take ~20 seconds
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Podcast ── */}
                {aeon.podcast && aeon.podcast.mp3Url && (
                  <div>
                    <SectionLabel>Today&apos;s Podcast · Aeon</SectionLabel>
                    <AudioPlayer
                      src={aeon.podcast.mp3Url}
                      title={aeon.podcast.title}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-screen PDF overlay */}
      {openPdf && (
        <PdfViewer
          url={openPdf.url}
          title={openPdf.title}
          onClose={() => setOpenPdf(null)}
        />
      )}
    </>
  );
}
