"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { getGroup, wordGroups } from "@/data/words";
import { useProgress } from "@/hooks/useProgress";
import { useState, useCallback } from "react";

/* ---------- Icons ---------- */
const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SpeakerIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function speak(word: string) {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    const u = new SpeechSynthesisUtterance(word);
    u.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }
}

/* ---------- Word Row ---------- */
function WordRow({
  word,
  index,
  status,
  onMark,
}: {
  word: { id: string; word: string; definition: string };
  index: number;
  status: "known" | "learning" | "new";
  onMark: (id: string, known: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`group rounded-xl border transition-all duration-200 ${
        status === "known"
          ? "bg-zinc-900/50 border-zinc-800"
          : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
      }`}
    >
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Number */}
        <span className="text-zinc-700 text-xs font-mono w-5 text-right shrink-0">
          {index}
        </span>

        {/* Word + definition */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold capitalize text-sm ${status === "known" ? "text-zinc-400 line-through decoration-zinc-700" : "text-zinc-100"}`}>
              {word.word}
            </h3>
            {status === "known" && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-950/40 text-green-400 border border-green-900/50">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Learned
              </span>
            )}
            {status === "learning" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-950/30 text-amber-400/80 border border-amber-900/40">
                Learning
              </span>
            )}
          </div>
          <p className={`text-xs mt-0.5 leading-relaxed ${status === "known" ? "text-zinc-600" : "text-zinc-500"}`}>
            {word.definition}
          </p>
        </div>

        {/* Quick action: toggle known */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); speak(word.word); }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors md:opacity-0 md:group-hover:opacity-100"
            title="Pronounce"
          >
            <SpeakerIcon />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMark(word.id, status !== "known"); }}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
              status === "known"
                ? "bg-green-950/40 text-green-400 border border-green-900/50 hover:bg-red-950/40 hover:text-red-400 hover:border-red-900/50"
                : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-green-950/40 hover:text-green-400 hover:border-green-900/50"
            }`}
            title={status === "known" ? "Mark as learning" : "Mark as known"}
          >
            {status === "known" ? <CheckIcon /> : <CheckIcon />}
          </button>
        </div>
      </div>

      {/* Expanded actions */}
      {expanded && (
        <div className="px-4 pb-3 pt-0 flex items-center gap-2 ml-8 animate-in">
          <button
            onClick={() => { onMark(word.id, true); setExpanded(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-950/30 text-green-400 border border-green-900/40 hover:bg-green-950/50 transition-colors"
          >
            <CheckIcon /> I know this
          </button>
          <button
            onClick={() => { onMark(word.id, false); setExpanded(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-950/30 text-red-400 border border-red-900/40 hover:bg-red-950/50 transition-colors"
          >
            <XIcon /> Still learning
          </button>
          <button
            onClick={() => speak(word.word)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-200 transition-colors"
          >
            <SpeakerIcon /> Pronounce
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Main Page ---------- */
export default function GroupDetailPage() {
  const params = useParams();
  const groupId = Number(params.id);
  const group = getGroup(groupId);
  const { progress, updateWord } = useProgress();
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [filter, setFilter] = useState<"all" | "new" | "learning" | "known">("all");

  const handleMark = useCallback((id: string, known: boolean) => {
    updateWord(id, known);
  }, [updateWord]);

  if (!group) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-zinc-600 text-lg mb-4">Group not found</p>
        <Link href="/groups" className="btn-primary">
          Back to Groups
        </Link>
      </div>
    );
  }

  const prevGroup = groupId > 1 ? groupId - 1 : null;
  const nextGroup = wordGroups.find((g) => g.id === groupId + 1) ? groupId + 1 : null;
  const learned = group.words.filter((w) => progress.words[w.id]?.known).length;
  const learning = group.words.filter((w) => progress.words[w.id] && !progress.words[w.id]?.known).length;
  const newCount = group.words.length - learned - learning;

  const getStatus = (id: string): "known" | "learning" | "new" => {
    const wp = progress.words[id];
    if (!wp) return "new";
    return wp.known ? "known" : "learning";
  };

  const filteredWords = group.words.filter((w) => {
    if (filter === "all") return true;
    return getStatus(w.id) === filter;
  });

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-5 gap-3">
        <div>
          <Link href="/groups" className="text-zinc-600 hover:text-zinc-400 text-xs mb-1 inline-block">
            ← Groups
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100">{group.name}</h1>
          <p className="text-zinc-500 text-xs sm:text-sm">{group.words.length} words · {learned} learned</p>
        </div>
        <div className="flex gap-1 sm:gap-1.5 flex-wrap">
          <button
            onClick={() => setViewMode("list")}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === "list" ? "bg-zinc-800 text-zinc-200" : "text-zinc-600 hover:text-zinc-400"}`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === "cards" ? "bg-zinc-800 text-zinc-200" : "text-zinc-600 hover:text-zinc-400"}`}
          >
            Cards
          </button>
          <Link href={`/flashcards?group=${groupId}`} className="btn-primary text-xs px-2.5 sm:px-3 py-1.5">
            Practice
          </Link>
        </div>
      </div>

      {/* Progress bar + stats */}
      <div className="mb-4 md:mb-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-green-500/70 transition-all duration-500"
              style={{ width: `${(learned / group.words.length) * 100}%` }}
            />
            <div
              className="h-full bg-amber-500/50 transition-all duration-500"
              style={{ width: `${(learning / group.words.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-zinc-500 shrink-0 tabular-nums">
            {Math.round((learned / group.words.length) * 100)}%
          </span>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 flex-wrap">
          {([
            { key: "all" as const, label: "All", count: group.words.length },
            { key: "new" as const, label: "New", count: newCount },
            { key: "learning" as const, label: "Learning", count: learning },
            { key: "known" as const, label: "Learned", count: learned },
          ]).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                filter === f.key
                  ? "bg-zinc-800 text-zinc-200 border border-zinc-600"
                  : "text-zinc-600 hover:text-zinc-400 border border-transparent"
              }`}
            >
              {f.label}
              <span className={`tabular-nums ${filter === f.key ? "text-zinc-400" : "text-zinc-700"}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Word List */}
      {viewMode === "list" ? (
        <div className="space-y-1.5">
          {filteredWords.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-600 text-sm">No words match this filter</p>
            </div>
          ) : (
            filteredWords.map((word, i) => (
              <WordRow
                key={word.id}
                word={word}
                index={i + 1}
                status={getStatus(word.id)}
                onMark={handleMark}
              />
            ))
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredWords.map((word) => {
            const st = getStatus(word.id);
            return (
              <div
                key={word.id}
                className={`card p-3.5 cursor-pointer transition-all ${
                  st === "known" ? "border-green-900/40 bg-green-950/10" : ""
                }`}
                onClick={() => handleMark(word.id, st !== "known")}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`font-semibold capitalize text-sm ${st === "known" ? "text-zinc-400" : "text-zinc-200"}`}>
                    {word.word}
                  </h3>
                  {st === "known" && (
                    <span className="text-green-500 shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </div>
                <p className="text-zinc-500 text-xs mt-1">{word.definition}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk actions */}
      <div className="flex items-center justify-center gap-3 mt-6 mb-2">
        <button
          onClick={() => group.words.forEach((w) => updateWord(w.id, true))}
          className="text-[11px] text-zinc-600 hover:text-green-400 transition-colors"
        >
          Mark all as known
        </button>
        <span className="text-zinc-800">·</span>
        <button
          onClick={() => group.words.forEach((w) => updateWord(w.id, false))}
          className="text-[11px] text-zinc-600 hover:text-red-400 transition-colors"
        >
          Reset all
        </button>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        {prevGroup ? (
          <Link href={`/groups/${prevGroup}`} className="btn-secondary text-xs">
            ← Group {prevGroup}
          </Link>
        ) : <div />}
        {nextGroup && (
          <Link href={`/groups/${nextGroup}`} className="btn-primary text-xs">
            Group {nextGroup} →
          </Link>
        )}
      </div>
    </div>
  );
}
