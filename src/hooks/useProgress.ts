"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// SRS intervals in milliseconds
const SRS_INTERVALS = [
  1 * 86400000,   // 1 day
  3 * 86400000,   // 3 days
  7 * 86400000,   // 7 days
  14 * 86400000,  // 14 days
  30 * 86400000,  // 30 days
];

export interface WordProgress {
  wordId: string;
  known: boolean;
  attempts: number;
  correctStreak: number;
  lastSeen: number;
  difficulty: "easy" | "medium" | "hard";
  nextReview: number;
  srsLevel: number; // 0-4 index into SRS_INTERVALS
}

export interface DailyGoal {
  target: number;
  wordsToday: number;
  date: string;
}

export interface ActivityDay {
  date: string;
  count: number;
}

export interface UserProgress {
  words: Record<string, WordProgress>;
  quizHistory: QuizResult[];
  dailyStreak: number;
  lastActive: string;
  totalWordsLearned: number;
  dailyGoal: DailyGoal;
  activityLog: ActivityDay[];
}

export interface QuizResult {
  date: string;
  groupId?: number;
  score: number;
  total: number;
  mode: string;
}

const STORAGE_KEY = "gre-vocab-progress";

function getDefaultProgress(): UserProgress {
  return {
    words: {},
    quizHistory: [],
    dailyStreak: 0,
    lastActive: "",
    totalWordsLearned: 0,
    dailyGoal: { target: 20, wordsToday: 0, date: "" },
    activityLog: [],
  };
}

function loadProgress(): UserProgress {
  if (typeof window === "undefined") return getDefaultProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old data
      if (!parsed.dailyGoal) parsed.dailyGoal = { target: 20, wordsToday: 0, date: "" };
      if (!parsed.activityLog) parsed.activityLog = [];
      return parsed;
    }
  } catch {}
  return getDefaultProgress();
}

function getWordsNeedingReview(words: Record<string, WordProgress>): WordProgress[] {
  const now = Date.now();
  return Object.values(words).filter(
    (w) => w.known && w.nextReview > 0 && w.nextReview <= now
  );
}

function syncToDb(p: UserProgress) {
  fetch("/api/progress", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ progress: p }),
  }).catch(() => {
    // Silently fail — localStorage is the fallback
  });
}

function mergeProgress(local: UserProgress, db: UserProgress): UserProgress {
  // Merge words — keep whichever has more attempts (more recent activity)
  const mergedWords: Record<string, WordProgress> = { ...local.words };
  for (const [id, dbWord] of Object.entries(db.words || {})) {
    const localWord = mergedWords[id];
    if (!localWord || dbWord.attempts > localWord.attempts || dbWord.lastSeen > localWord.lastSeen) {
      mergedWords[id] = dbWord;
    }
  }

  // Quiz history — deduplicate by date+score
  const quizSet = new Set(local.quizHistory.map((q) => `${q.date}-${q.score}-${q.total}`));
  const mergedQuiz = [...local.quizHistory];
  for (const q of db.quizHistory || []) {
    const key = `${q.date}-${q.score}-${q.total}`;
    if (!quizSet.has(key)) {
      mergedQuiz.push(q);
      quizSet.add(key);
    }
  }

  // Activity log — merge by date
  const actMap = new Map<string, number>();
  for (const a of [...(local.activityLog || []), ...(db.activityLog || [])]) {
    actMap.set(a.date, Math.max(actMap.get(a.date) || 0, a.count));
  }
  const mergedActivity = Array.from(actMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-90);

  return {
    words: mergedWords,
    quizHistory: mergedQuiz.sort((a, b) => a.date.localeCompare(b.date)),
    dailyStreak: Math.max(local.dailyStreak, db.dailyStreak || 0),
    lastActive: local.lastActive > (db.lastActive || "") ? local.lastActive : db.lastActive || "",
    totalWordsLearned: Object.values(mergedWords).filter((w) => w.known).length,
    dailyGoal: local.dailyGoal.date >= (db.dailyGoal?.date || "") ? local.dailyGoal : db.dailyGoal || local.dailyGoal,
    activityLog: mergedActivity,
  };
}

export function useProgress() {
  const [progress, setProgress] = useState<UserProgress>(getDefaultProgress);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncing = useRef(false);

  // Load from localStorage first, then fetch from DB
  useEffect(() => {
    const local = loadProgress();
    setProgress(local);

    // Fetch from DB and merge (DB wins)
    fetch("/api/progress")
      .then((r) => r.json())
      .then((data) => {
        if (data.progress) {
          const merged = mergeProgress(local, data.progress);
          setProgress(merged);
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          }
        } else {
          // No DB data yet — push local to DB
          if (Object.keys(local.words).length > 0) {
            syncToDb(local);
          }
        }
      })
      .catch(() => {
        // Offline — use local data silently
      });
  }, []);

  const save = useCallback((p: UserProgress) => {
    setProgress(p);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    }
    // Debounced DB sync
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => syncToDb(p), 2000);
  }, []);

  const updateWord = useCallback(
    (wordId: string, correct: boolean) => {
      const p = { ...progress };
      const existing = p.words[wordId] || {
        wordId,
        known: false,
        attempts: 0,
        correctStreak: 0,
        lastSeen: Date.now(),
        difficulty: "medium" as const,
        nextReview: 0,
        srsLevel: 0,
      };

      existing.attempts += 1;
      existing.lastSeen = Date.now();

      if (correct) {
        existing.correctStreak += 1;
        if (existing.correctStreak >= 3) {
          existing.known = true;
          existing.difficulty = "easy";
          // Progress SRS level
          existing.srsLevel = Math.min(existing.srsLevel + 1, SRS_INTERVALS.length - 1);
        } else if (existing.correctStreak >= 1) {
          existing.difficulty = "medium";
        }
        // Set next review based on SRS level
        existing.nextReview = Date.now() + SRS_INTERVALS[existing.srsLevel];
      } else {
        existing.correctStreak = 0;
        existing.difficulty = "hard";
        existing.known = false;
        // Reset SRS
        existing.srsLevel = 0;
        existing.nextReview = Date.now() + SRS_INTERVALS[0];
      }

      p.words[wordId] = existing;
      p.totalWordsLearned = Object.values(p.words).filter((w) => w.known).length;

      // Daily tracking
      const today = new Date().toISOString().split("T")[0];
      if (p.lastActive !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        p.dailyStreak = p.lastActive === yesterday ? p.dailyStreak + 1 : 1;
        p.lastActive = today;
        p.dailyGoal = { ...p.dailyGoal, wordsToday: 1, date: today };
      } else {
        p.dailyGoal = { ...p.dailyGoal, wordsToday: p.dailyGoal.wordsToday + 1, date: today };
      }

      // Activity log
      const logIdx = p.activityLog.findIndex((a) => a.date === today);
      if (logIdx >= 0) {
        p.activityLog[logIdx].count += 1;
      } else {
        p.activityLog = [...p.activityLog, { date: today, count: 1 }];
        // Keep last 90 days
        if (p.activityLog.length > 90) {
          p.activityLog = p.activityLog.slice(-90);
        }
      }

      save(p);
    },
    [progress, save]
  );

  const setDailyTarget = useCallback(
    (target: number) => {
      const p = { ...progress };
      p.dailyGoal = { ...p.dailyGoal, target };
      save(p);
    },
    [progress, save]
  );

  const addQuizResult = useCallback(
    (result: QuizResult) => {
      const p = { ...progress };
      p.quizHistory = [...p.quizHistory, result];
      save(p);
    },
    [progress, save]
  );

  const getWordProgress = useCallback(
    (wordId: string): WordProgress | undefined => {
      return progress.words[wordId];
    },
    [progress]
  );

  const getGroupProgress = useCallback(
    (groupId: number, wordIds: string[]) => {
      const total = wordIds.length;
      const learned = wordIds.filter((id) => progress.words[id]?.known).length;
      const seen = wordIds.filter((id) => progress.words[id]).length;
      return { total, learned, seen, percentage: Math.round((learned / total) * 100) };
    },
    [progress]
  );

  const getReviewWords = useCallback(() => {
    return getWordsNeedingReview(progress.words);
  }, [progress]);

  const resetProgress = useCallback(() => {
    save(getDefaultProgress());
  }, [save]);

  return {
    progress,
    updateWord,
    addQuizResult,
    getWordProgress,
    getGroupProgress,
    getReviewWords,
    setDailyTarget,
    resetProgress,
  };
}
