"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { allWords } from "@/data/words";
import { useProgress } from "@/hooks/useProgress";

type Filter = "due" | "hard" | "low-streak" | "all-seen";

export default function WeakWordsPage() {
  const { progress, getReviewWords } = useProgress();
  const [filter, setFilter] = useState<Filter>("due");

  const reviewWordIds = useMemo(() => {
    const reviewWords = getReviewWords();
    return new Set(reviewWords.map((w) => w.wordId));
  }, [progress]);

  const words = useMemo(() => {
    const seen = allWords.filter((w) => progress.words[w.id]);

    switch (filter) {
      case "due":
        return allWords.filter((w) => reviewWordIds.has(w.id));
      case "hard":
        return seen.filter((w) => progress.words[w.id]?.difficulty === "hard");
      case "low-streak":
        return seen
          .filter((w) => (progress.words[w.id]?.correctStreak || 0) < 3)
          .sort(
            (a, b) =>
              (progress.words[a.id]?.correctStreak || 0) -
              (progress.words[b.id]?.correctStreak || 0)
          );
      case "all-seen":
        return seen.sort(
          (a, b) =>
            (progress.words[a.id]?.lastSeen || 0) -
            (progress.words[b.id]?.lastSeen || 0)
        );
    }
  }, [filter, progress, reviewWordIds]);

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "due", label: "Due for Review", count: reviewWordIds.size },
    {
      key: "hard",
      label: "Hard Words",
      count: allWords.filter((w) => progress.words[w.id]?.difficulty === "hard").length,
    },
    {
      key: "low-streak",
      label: "Low Streak",
      count: allWords.filter(
        (w) => progress.words[w.id] && (progress.words[w.id]?.correctStreak || 0) < 3
      ).length,
    },
    {
      key: "all-seen",
      label: "All Seen",
      count: Object.keys(progress.words).length,
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-8">
      <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 mb-1">Review</h1>
      <p className="text-zinc-500 text-xs sm:text-sm mb-4 md:mb-6">
        Words that need attention based on SRS and difficulty
      </p>

      <div className="flex gap-1 mb-4 md:mb-6 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2.5 sm:px-3 py-1.5 md:py-2 rounded-md text-xs transition-colors ${
              filter === f.key
                ? "bg-zinc-100 text-zinc-900"
                : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800"
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-[10px] opacity-60">{f.count}</span>
          </button>
        ))}
      </div>

      {words.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-zinc-500 text-sm mb-4">
            {filter === "due"
              ? "No words due for review right now."
              : filter === "hard"
                ? "No words marked as hard."
                : "No words match this filter."}
          </p>
          <Link href="/learn" className="btn-primary px-4 py-2 text-sm inline-block">
            Start Learning
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-zinc-600">{words.length} words</p>
            <Link
              href={`/flashcards?words=${words.map((w) => w.id).join(",")}`}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Practice with Flashcards →
            </Link>
          </div>

          <div className="space-y-1">
            {words.map((w) => {
              const wp = progress.words[w.id];
              return (
                <div
                  key={w.id}
                  className="card p-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-200 capitalize">
                      {w.word}
                    </p>
                    <p className="text-xs text-zinc-600 truncate">
                      {w.definition}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap justify-end">
                    {wp && (
                      <>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            wp.difficulty === "hard"
                              ? "bg-zinc-800 text-zinc-400"
                              : wp.difficulty === "easy"
                                ? "bg-zinc-900 text-zinc-600"
                                : "bg-zinc-900 text-zinc-600"
                          }`}
                        >
                          {wp.difficulty}
                        </span>
                        <span className="text-[10px] text-zinc-700">
                          streak {wp.correctStreak}
                        </span>
                        <span className="text-[10px] text-zinc-700">
                          SRS {wp.srsLevel || 0}
                        </span>
                      </>
                    )}
                    <span className="text-[10px] text-zinc-700">G{w.group}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
