"use client";

import { useState, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up the PDF.js worker via CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  title: string;
  onClose: () => void;
}

export default function PdfViewer({ url, title, onClose }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Measure container to dynamically size pages
  const measureRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") setPageNumber((p) => Math.min(p + 1, numPages));
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") setPageNumber((p) => Math.max(p - 1, 1));
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [numPages, onClose]);

  const prevPage = () => setPageNumber((p) => Math.max(p - 1, 1));
  const nextPage = () => setPageNumber((p) => Math.min(p + 1, numPages));

  const proxyUrl = `/api/pdf-proxy?url=${encodeURIComponent(url)}`;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm flex-shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-100 truncate">{title}</p>
          {numPages > 0 && (
            <p className="text-xs text-zinc-500">
              Page {pageNumber} of {numPages}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-4 flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
          aria-label="Close viewer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* PDF area */}
      <div
        ref={measureRef}
        className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center justify-start py-4 px-2 bg-zinc-900"
      >
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-zinc-400">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p className="text-zinc-300 font-medium mb-1">Failed to load PDF</p>
            <p className="text-zinc-500 text-sm">{error}</p>
            <button
              onClick={() => { setError(null); setLoading(true); }}
              className="mt-4 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-zinc-700 border-t-zinc-300 animate-spin" />
                <p className="text-zinc-500 text-sm">Loading newspaper...</p>
              </div>
            )}
            <div className={loading ? "opacity-0 pointer-events-none" : ""}>
              <Document
                file={proxyUrl}
                onLoadSuccess={({ numPages }) => {
                  setNumPages(numPages);
                  setLoading(false);
                }}
                onLoadError={(err) => {
                  setError(err.message || "Could not open PDF");
                  setLoading(false);
                }}
                loading=""
                error=""
              >
                <Page
                  pageNumber={pageNumber}
                  width={containerWidth > 0 ? Math.min(containerWidth - 8, 900) : undefined}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  loading=""
                  className="shadow-2xl rounded-sm overflow-hidden"
                />
              </Document>
            </div>
          </>
        )}
      </div>

      {/* Page navigation footer */}
      {numPages > 0 && (
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
          <button
            onClick={prevPage}
            disabled={pageNumber <= 1}
            className="flex items-center gap-2 px-5 py-3 rounded-xl min-h-[52px] min-w-[100px] justify-center bg-zinc-800 text-zinc-300 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 active:scale-95 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Prev
          </button>

          {/* Page jump dots — show up to 5 page indicators */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.min(numPages, 5) }, (_, i) => {
              let page: number;
              if (numPages <= 5) {
                page = i + 1;
              } else if (pageNumber <= 3) {
                page = i + 1;
              } else if (pageNumber >= numPages - 2) {
                page = numPages - 4 + i;
              } else {
                page = pageNumber - 2 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => setPageNumber(page)}
                  className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                    page === pageNumber
                      ? "bg-zinc-100 text-zinc-900 scale-110"
                      : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                  }`}
                >
                  {page}
                </button>
              );
            })}
            {numPages > 5 && (
              <span className="text-zinc-600 text-xs ml-1">/{numPages}</span>
            )}
          </div>

          <button
            onClick={nextPage}
            disabled={pageNumber >= numPages}
            className="flex items-center gap-2 px-5 py-3 rounded-xl min-h-[52px] min-w-[100px] justify-center bg-zinc-800 text-zinc-300 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 active:scale-95 transition-all"
          >
            Next
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
