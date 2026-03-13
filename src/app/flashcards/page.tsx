"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { wordGroups, allWords, type Word } from "@/data/words";
import { useProgress } from "@/hooks/useProgress";
import Flashcard from "@/components/Flashcard";
import GroupSelector from "@/components/GroupSelector";

type StudyMode = "all" | "unlearned" | "hard" | "review";

export default function FlashcardsPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-8 text-zinc-600 text-sm">Loading...</div>}>
      <FlashcardsInner />
    </Suspense>
  );
}

function FlashcardsInner() {
  const searchParams = useSearchParams();
  const presetGroup = searchParams.get("group");
  const presetWords = searchParams.get("words");

  const [selectedGroup, setSelectedGroup] = useState<number | null>(
    presetGroup ? Number(presetGroup) : null
  );
  const [mode, setMode] = useState<StudyMode>("all");
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(!!presetGroup || !!presetWords);
  const { progress, updateWord } = useProgress();

  const words = useMemo(() => {
    // If specific word IDs are passed (from weak-words), use those
    if (presetWords) {
      const ids = new Set(presetWords.split(","));
      return allWords.filter((w) => ids.has(w.id)).sort(() => Math.random() - 0.5);
    }

    let pool: Word[] = selectedGroup
      ? wordGroups.find((g) => g.id === selectedGroup)?.words || []
      : allWords;

    switch (mode) {
      case "unlearned":
        pool = pool.filter((w) => !progress.words[w.id]?.known);
        break;
      case "hard":
        pool = pool.filter((w) => progress.words[w.id]?.difficulty === "hard");
        break;
      case "review":
        pool = pool.filter((w) => progress.words[w.id]?.known);
        break;
    }

    return [...pool].sort(() => Math.random() - 0.5);
  }, [selectedGroup, mode, progress]);

  const currentWord = words[index];

  const handleNext = useCallback(
    (known: boolean) => {
      if (currentWord) updateWord(currentWord.id, known);
      if (index < words.length - 1) setIndex((prev) => prev + 1);
    },
    [currentWord, index, words.length, updateWord]
  );

  if (!started) {
    return (
      <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-8">
        <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 mb-1">Flashcards</h1>
        <p className="text-zinc-500 text-xs sm:text-sm mb-6 md:mb-8">Review vocabulary with flip cards</p>

        <div className="mb-4 md:mb-6">
          <h2 className="text-xs md:text-sm font-medium text-zinc-400 mb-2 md:mb-3">Group</h2>
          <GroupSelector selectedGroup={selectedGroup} onSelect={setSelectedGroup} />
        </div>

        <div className="mb-6 md:mb-8">
          <h2 className="text-xs md:text-sm font-medium text-zinc-400 mb-2 md:mb-3">Mode</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              { key: "all", label: "All Words", desc: "Study everything" },
              { key: "unlearned", label: "New", desc: "Not yet mastered" },
              { key: "hard", label: "Difficult", desc: "Marked as hard" },
              { key: "review", label: "Review", desc: "Already mastered" },
            ] as const).map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`card p-3 text-left min-h-[48px] ${
                  mode === m.key ? "border-zinc-500 bg-zinc-900" : ""
                }`}
              >
                <p className="text-xs md:text-sm font-medium text-zinc-200">{m.label}</p>
                <p className="text-[10px] md:text-[11px] text-zinc-600">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => { setIndex(0); setStarted(true); }}
          className="btn-primary px-4 sm:px-6 py-2 md:py-2.5 text-xs md:text-sm"
        >
          Start ({selectedGroup
            ? wordGroups.find((g) => g.id === selectedGroup)?.words.length
            : allWords.length} words)
        </button>
      </div>
    );
  }

  if (!currentWord || words.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">
          {words.length === 0 ? "No words match" : "Session Complete"}
        </h2>
        <p className="text-zinc-500 text-sm mb-6">
          {words.length === 0 ? "Try a different mode or group." : `Reviewed all ${words.length} words.`}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setStarted(false); setIndex(0); }} className="btn-secondary">
            Settings
          </button>
          <button onClick={() => setIndex(0)} className="btn-primary">
            Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => { setStarted(false); setIndex(0); }}
          className="text-zinc-600 hover:text-zinc-300 text-xs"
        >
          ← Back
        </button>
        <div className="text-center">
          <p className="text-xs text-zinc-500">{index + 1} / {words.length}</p>
          <div className="w-40 h-1 bg-zinc-800 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-zinc-400 rounded-full transition-all"
              style={{ width: `${((index + 1) / words.length) * 100}%` }}
            />
          </div>
        </div>
        <span className="text-[11px] text-zinc-700">G{currentWord.group}</span>
      </div>

      <Flashcard
        key={currentWord.id}
        word={currentWord}
        onKnown={() => handleNext(true)}
        onUnknown={() => handleNext(false)}
      />

      <div className="flex justify-between mt-8">
        <button
          onClick={() => setIndex(Math.max(0, index - 1))}
          disabled={index === 0}
          className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed text-sm py-3 px-4 -ml-4 rounded-lg min-h-[48px]"
        >
          ← Previous
        </button>
        <button
          onClick={() => handleNext(false)}
          className="text-zinc-600 hover:text-zinc-300 text-sm py-3 px-4 -mr-4 rounded-lg min-h-[48px]"
        >
          Skip →
        </button>
      </div>
    </div>
  );
}
