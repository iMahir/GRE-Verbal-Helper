"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { wordGroups, allWords, type Word } from "@/data/words";
import { useProgress } from "@/hooks/useProgress";

interface AiEnrichment {
  distractors: string[];
  example: string;
}

type AnswerState = "unanswered" | "correct" | "wrong" | "unsure";

function getLevel(mastered: number) {
  const levels = [
    { name: "Basic", perLevel: 10 },
    { name: "Intermediate", perLevel: 15 },
    { name: "Advanced", perLevel: 20 },
    { name: "Expert", perLevel: 25 },
    { name: "Master", perLevel: 30 },
  ];
  let remaining = mastered;
  for (const { name, perLevel } of levels) {
    for (let lvl = 1; lvl <= 10; lvl++) {
      if (remaining < perLevel) {
        return { name: `${name} ${lvl}`, wordsForNext: perLevel - remaining, progressInLevel: remaining / perLevel };
      }
      remaining -= perLevel;
    }
  }
  return { name: "Grandmaster", wordsForNext: 0, progressInLevel: 1 };
}

function pickNextWords(
  pool: Word[],
  wordsMap: Record<string, { known: boolean; difficulty: string; lastSeen: number; correctStreak: number }>,
  count: number,
  exclude: Set<string>
): Word[] {
  const result: Word[] = [];
  const used = new Set(exclude);
  const pick = (candidates: Word[]) => {
    const filtered = candidates.filter((w) => !used.has(w.id));
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    for (const w of shuffled) {
      if (result.length >= count) return;
      result.push(w);
      used.add(w.id);
    }
  };
  pick(pool.filter((w) => !wordsMap[w.id]));
  pick(pool.filter((w) => wordsMap[w.id]?.difficulty === "hard"));
  pick(pool.filter((w) => wordsMap[w.id] && !wordsMap[w.id].known));
  pick(pool.filter((w) => wordsMap[w.id]?.known).sort((a, b) => (wordsMap[a.id]?.lastSeen || 0) - (wordsMap[b.id]?.lastSeen || 0)));
  return result;
}

function localDistractors(word: Word, pool: Word[]): string[] {
  const correctShort = word.definition.split(";")[0].split(",")[0].trim().toLowerCase();
  const correctLen = correctShort.length;
  const candidates = pool
    .filter((w) => w.id !== word.id)
    .map((w) => {
      const d = w.definition.split(";")[0].split(",")[0].trim().toLowerCase();
      return { text: d, diff: Math.abs(d.length - correctLen) };
    })
    .filter((c) => c.text !== correctShort)
    .sort((a, b) => a.diff - b.diff);
  const top = candidates.slice(0, 20).sort(() => Math.random() - 0.5);
  return top.slice(0, 3).map((c) => c.text);
}

function buildOptions(word: Word, pool: Word[], ai?: AiEnrichment) {
  const shortDef = word.definition.split(";")[0].split(",")[0].trim().toLowerCase();
  const distractors = ai?.distractors?.length === 3
    ? ai.distractors.map((d) => d.toLowerCase())
    : localDistractors(word, pool);
  return [
    { text: shortDef, isCorrect: true },
    ...distractors.map((d) => ({ text: d, isCorrect: false })),
  ].sort(() => Math.random() - 0.5);
}

async function fetchAiData(word: Word): Promise<AiEnrichment | null> {
  const shortDef = word.definition.split(";")[0].split(",")[0].trim().toLowerCase();
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mcq", word: word.word, definition: shortDef }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.result.replace(/```json\n?|```\n?/g, "").trim();
    const mcq = JSON.parse(result);
    if (!mcq.distractors || mcq.distractors.length < 3) return null;
    return { distractors: mcq.distractors.slice(0, 3), example: mcq.example || "" };
  } catch {
    return null;
  }
}

function speakWord(word: string) {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }
}

const PREFETCH_COUNT = 5;

export default function LearnPage() {
  const { progress, updateWord } = useProgress();
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [options, setOptions] = useState<{ text: string; isCorrect: boolean }[]>([]);
  const [answerState, setAnswerState] = useState<AnswerState>("unanswered");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [example, setExample] = useState<string>("");
  const [exampleLoading, setExampleLoading] = useState(false);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);

  const aiCache = useRef<Map<string, AiEnrichment>>(new Map());
  const pendingFetches = useRef<Set<string>>(new Set());
  const wordQueue = useRef<Word[]>([]);
  const answerStateRef = useRef<AnswerState>("unanswered");

  // Load AI cache from localStorage on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem("vm-ai-learn-cache");
      if (cached) {
        const entries: [string, AiEnrichment][] = JSON.parse(cached);
        aiCache.current = new Map(entries);
      }
    } catch { /* ignore */ }
  }, []);

  const saveAiCache = useCallback(() => {
    try {
      const entries = Array.from(aiCache.current.entries()).slice(-200); // keep last 200
      localStorage.setItem("vm-ai-learn-cache", JSON.stringify(entries));
    } catch { /* ignore */ }
  }, []);

  // Keep ref in sync for keyboard handler
  useEffect(() => { answerStateRef.current = answerState; }, [answerState]);

  const pool = useMemo(
    () => selectedGroup ? wordGroups.find((g) => g.id === selectedGroup)?.words || [] : allWords,
    [selectedGroup]
  );

  const mastered = useMemo(
    () => Object.values(progress.words).filter((w) => w.known).length,
    [progress]
  );

  const level = useMemo(() => getLevel(mastered), [mastered]);

  const prefetchWords = useCallback((words: Word[]) => {
    for (const w of words) {
      if (aiCache.current.has(w.id) || pendingFetches.current.has(w.id)) continue;
      pendingFetches.current.add(w.id);
      fetchAiData(w).then((data) => {
        pendingFetches.current.delete(w.id);
        if (data) {
          aiCache.current.set(w.id, data);
          saveAiCache();
        }
      });
    }
  }, [saveAiCache]);

  const showWord = useCallback(
    (word: Word) => {
      setCurrentWord(word);
      setAnswerState("unanswered");
      setSelectedIdx(null);
      const cached = aiCache.current.get(word.id);
      setOptions(buildOptions(word, pool, cached || undefined));
      setExample(cached?.example || "");
      if (!cached) {
        setExampleLoading(true);
        fetchAiData(word).then((data) => {
          if (data) {
            aiCache.current.set(word.id, data);
            saveAiCache();
            setExample((prev) => prev || data.example);
          }
          setExampleLoading(false);
        });
      } else {
        setExampleLoading(false);
      }
    },
    [pool]
  );

  const startSession = useCallback(() => {
    setStarted(true);
    setWordsCompleted(0);
    setSessionCorrect(0);
    pendingFetches.current.clear();
    const upcoming = pickNextWords(pool, progress.words, PREFETCH_COUNT + 1, new Set());
    const first = upcoming[0];
    wordQueue.current = upcoming.slice(1);
    prefetchWords(upcoming.slice(1));
    if (first) showWord(first);
  }, [pool, progress.words, prefetchWords, showWord]);

  const handleSelect = useCallback(
    (idx: number) => {
      if (answerState !== "unanswered" || !currentWord) return;
      setSelectedIdx(idx);
      const isCorrect = options[idx].isCorrect;
      setAnswerState(isCorrect ? "correct" : "wrong");
      updateWord(currentWord.id, isCorrect);
      setWordsCompleted((c) => c + 1);
      if (isCorrect) setSessionCorrect((c) => c + 1);
    },
    [answerState, currentWord, options, updateWord]
  );

  const handleUnsure = useCallback(() => {
    if (answerState !== "unanswered" || !currentWord) return;
    setAnswerState("unsure");
    // Don't mark wrong immediately — just reveal, user advances with Next
  }, [answerState, currentWord]);

  const handleNext = useCallback(() => {
    // Mark skipped words as wrong when advancing
    if (answerState === "unsure" && currentWord) {
      updateWord(currentWord.id, false);
      setWordsCompleted((c) => c + 1);
    }

    let next = wordQueue.current.shift();
    if (!next) {
      const exclude = new Set(currentWord ? [currentWord.id] : []);
      const upcoming = pickNextWords(pool, progress.words, PREFETCH_COUNT + 1, exclude);
      next = upcoming[0];
      wordQueue.current = upcoming.slice(1);
      prefetchWords(upcoming.slice(1));
    } else {
      const exclude = new Set([...(currentWord ? [currentWord.id] : []), ...wordQueue.current.map((w) => w.id), next.id]);
      const more = pickNextWords(pool, progress.words, PREFETCH_COUNT - wordQueue.current.length, exclude);
      wordQueue.current.push(...more);
      prefetchWords(more);
    }
    if (next) showWord(next);
  }, [currentWord, pool, progress.words, prefetchWords, showWord]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!started) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (answerStateRef.current === "unanswered") {
        if (e.key >= "1" && e.key <= "4") {
          e.preventDefault();
          handleSelect(parseInt(e.key) - 1);
        } else if (e.key.toLowerCase() === "s") {
          e.preventDefault();
          handleUnsure();
        }
      } else {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNext();
        } else if (e.key.toLowerCase() === "p" && currentWord) {
          e.preventDefault();
          speakWord(currentWord.word);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [started, handleSelect, handleUnsure, handleNext, currentWord]);

  // Setup screen
  if (!started) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-semibold text-zinc-100 mb-1">Learn</h1>
        <p className="text-zinc-500 text-sm mb-8">
          AI-powered vocabulary quizzes with spaced repetition
        </p>

        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-zinc-500">Level</p>
              <p className="text-lg font-medium text-zinc-200">{level.name}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-zinc-100">{mastered}</p>
              <p className="text-xs text-zinc-500">mastered</p>
            </div>
          </div>
          {level.wordsForNext > 0 && (
            <>
              <p className="text-xs text-zinc-600 mb-1">
                {level.wordsForNext} more to next level
              </p>
              <div className="learn-level-bar">
                <div className="learn-level-fill" style={{ width: `${level.progressInLevel * 100}%` }} />
              </div>
            </>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Group</h2>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedGroup(null)}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                selectedGroup === null
                  ? "bg-zinc-100 text-zinc-900"
                  : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800"
              }`}
            >
              All ({allWords.length})
            </button>
            {wordGroups.map((g) => {
              const gLearned = g.words.filter((w) => progress.words[w.id]?.known).length;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroup(g.id)}
                  className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                    selectedGroup === g.id
                      ? "bg-zinc-100 text-zinc-900"
                      : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800"
                  }`}
                >
                  {g.id}
                  {gLearned > 0 && <span className="ml-0.5 opacity-50">({gLearned})</span>}
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={startSession} className="btn-primary px-6 py-2.5">
          Start Learning
        </button>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="learn-card learn-animate" style={{ width: "100%", maxWidth: 480 }}>
          <div className="learn-header new">
            <p className="text-zinc-500 text-sm">Loading...</p>
          </div>
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-zinc-500 border-t-transparent rounded-full mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  const correctOption = options.find((o) => o.isCorrect);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8">
      {/* Session bar */}
      <div className="flex items-center gap-6 mb-5 text-xs text-zinc-500">
        <button onClick={() => setStarted(false)} className="hover:text-zinc-300 transition-colors">
          ← Exit
        </button>
        <span>{wordsCompleted} words</span>
        <span>
          {wordsCompleted > 0 ? Math.round((sessionCorrect / wordsCompleted) * 100) : 0}% correct
        </span>
      </div>

      <div className="learn-card learn-animate" key={currentWord.id} style={{ width: "100%", maxWidth: 480 }}>
        {/* Header */}
        {answerState === "unanswered" ? (
          <div className="learn-header new">
            <p className="text-zinc-400 font-medium">
              {progress.words[currentWord.id] ? "Review" : "New Word"}
            </p>
            <p className="text-zinc-600 text-xs mt-0.5">Choose the definition</p>
          </div>
        ) : answerState === "correct" ? (
          <div className="learn-header correct">
            <p className="text-green-400 font-medium text-lg">Correct</p>
            <p className="text-green-500/60 text-xs mt-0.5">Scheduled for later review</p>
          </div>
        ) : (
          <div className="learn-header incorrect">
            <p className="text-red-400 font-medium text-lg">
              {answerState === "unsure" ? "Skipped" : "Incorrect"}
            </p>
            <p className="text-red-400/50 text-xs mt-0.5">Review the definition below</p>
          </div>
        )}

        {/* Word */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <p className="text-2xl font-semibold text-zinc-100 capitalize">
            {currentWord.word}
          </p>
          <button
            onClick={() => speakWord(currentWord.word)}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 transition-colors"
            title="Pronounce (P)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          </button>
        </div>

        {/* Options */}
        {answerState === "unanswered" && (
          <div>
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                className="learn-option"
              >
                <span className="kbd mr-2">{i + 1}</span>
                {opt.text}
              </button>
            ))}
            <button onClick={handleUnsure} className="learn-option text-zinc-600 italic">
              <span className="kbd mr-2">S</span>
              Skip
            </button>
          </div>
        )}

        {/* Answer view */}
        {answerState !== "unanswered" && (
          <div>
            <div className="px-5 py-3 border-b border-zinc-800">
              <p className="text-zinc-300 text-sm">
                <span className="text-green-400 mr-2">✓</span>
                {correctOption?.text}
              </p>
            </div>

            {example ? (
              <div className="px-5 py-3 border-b border-zinc-800">
                <p
                  className="text-zinc-500 italic text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: example
                      .replace(/\*\*([^*]+)\*\*/g, '$1')
                      .replace(
                        new RegExp(`\\b${currentWord.word}\\b`, "gi"),
                        `<strong class="text-zinc-200 not-italic font-semibold">${currentWord.word}</strong>`
                      ),
                  }}
                />
              </div>
            ) : exampleLoading ? (
              <div className="px-5 py-3 border-b border-zinc-800 flex items-center gap-2">
                <div className="animate-spin w-3 h-3 border border-zinc-600 border-t-transparent rounded-full" />
                <span className="text-zinc-600 text-xs">Loading example...</span>
              </div>
            ) : null}

            <div className="px-5 py-3">
              <p className="text-zinc-600 text-xs">
                {level.wordsForNext} more to{" "}
                <span className="text-zinc-400">{level.name}</span>
              </p>
              <div className="learn-level-bar">
                <div className="learn-level-fill" style={{ width: `${level.progressInLevel * 100}%` }} />
              </div>
            </div>

            <div className="learn-footer">
              <button onClick={handleNext} className="learn-next-btn">
                Next <span className="ml-1 inline-flex items-center justify-center min-w-[1.5rem] h-[1.5rem] px-1 rounded text-[10px] bg-zinc-900 text-zinc-300 border border-zinc-700">↵</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {answerState === "wrong" && selectedIdx !== null && (
        <p className="text-red-400/70 text-xs mt-3">
          You selected: &quot;{options[selectedIdx].text}&quot;
        </p>
      )}

      {/* Keyboard hints */}
      {answerState === "unanswered" && (
        <p className="text-zinc-700 text-[10px] mt-4">
          Press 1-4 to select · S to skip
        </p>
      )}
      {answerState !== "unanswered" && (
        <p className="text-zinc-700 text-[10px] mt-4">
          Enter for next · P to pronounce
        </p>
      )}
    </div>
  );
}
