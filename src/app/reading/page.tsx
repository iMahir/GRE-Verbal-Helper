"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

// Load the PDF viewer only on the client — react-pdf requires browser APIs
const PdfViewer = dynamic(() => import("@/components/PdfViewer"), { ssr: false });

type Tab = "newspapers" | "articles";

interface Newspaper {
  label: string;
  pdfUrl: string | null;
  available: boolean;
}

const NEWSPAPER_META: Record<string, { subtitle: string; icon: string }> = {
  "The Hindu International": { subtitle: "International edition", icon: "TH" },
  "Indian Express": { subtitle: "Delhi edition", icon: "IE" },
};

export default function ReadingPage() {
  const [tab, setTab] = useState<Tab>("newspapers");
  const [newspapers, setNewspapers] = useState<Newspaper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [openPdf, setOpenPdf] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    setLoadingPapers(true);
    setFetchError(null);
    fetch("/api/newspapers")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setNewspapers(data.newspapers);
      })
      .catch((err) => setFetchError(err.message || "Failed to load newspapers"))
      .finally(() => setLoadingPapers(false));
  }, []);

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 mb-1">Reading</h1>
          <p className="text-zinc-500 text-xs sm:text-sm">Daily newspapers and GRE reading practice</p>
        </div>

        {/* Tabs */}
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

        {/* Newspapers tab */}
        {tab === "newspapers" && (
          <div>
            <p className="text-xs text-zinc-600 mb-4">
              Today&apos;s editions · sourced from IndiaGS
            </p>

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

            {fetchError && (
              <div className="card p-5 border-red-900/40 bg-red-950/20">
                <p className="text-sm text-red-400 font-medium mb-1">Could not load newspapers</p>
                <p className="text-xs text-zinc-600">{fetchError}</p>
                <button
                  onClick={() => {
                    setFetchError(null);
                    setLoadingPapers(true);
                    fetch("/api/newspapers")
                      .then((r) => r.json())
                      .then((d) => setNewspapers(d.newspapers))
                      .catch((e) => setFetchError(e.message))
                      .finally(() => setLoadingPapers(false));
                  }}
                  className="mt-3 text-xs text-zinc-400 hover:text-zinc-200 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {!loadingPapers && !fetchError && (
              <div className="space-y-3">
                {newspapers.map((paper) => {
                  const meta = NEWSPAPER_META[paper.label] ?? {
                    subtitle: "Today's edition",
                    icon: paper.label.slice(0, 2).toUpperCase(),
                  };
                  return (
                    <div key={paper.label} className="card p-4 sm:p-5">
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-zinc-700">
                          <span className="text-xs font-bold text-zinc-300">{meta.icon}</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate">{paper.label}</p>
                          <p className="text-xs text-zinc-600">{meta.subtitle}</p>
                        </div>

                        {/* Read button */}
                        {paper.available && paper.pdfUrl ? (
                          <button
                            onClick={() =>
                              setOpenPdf({ url: paper.pdfUrl!, title: paper.label })
                            }
                            className="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-100 text-zinc-900 text-sm font-medium min-h-[48px] min-w-[88px] justify-center hover:bg-zinc-200 active:scale-95 transition-all"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                            </svg>
                            Read
                          </button>
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
            )}

            {/* Attribution note */}
            {!loadingPapers && !fetchError && (
              <p className="text-[11px] text-zinc-700 mt-5 text-center">
                PDFs sourced from indiags.com · For personal study use only
              </p>
            )}
          </div>
        )}

        {/* Articles tab — placeholder */}
        {tab === "articles" && (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-zinc-600">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <p className="text-zinc-400 font-medium mb-1">Articles coming soon</p>
            <p className="text-zinc-600 text-sm">Curated GRE reading passages will appear here</p>
          </div>
        )}
      </div>

      {/* PDF Viewer overlay */}
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
