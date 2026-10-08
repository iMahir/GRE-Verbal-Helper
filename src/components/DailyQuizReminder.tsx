"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useProgress } from "@/hooks/useProgress";
import { wordGroups } from "@/data/words";

const PERMISSION_KEY = "vm-daily-quiz-notification-asked";

export default function DailyQuizReminder() {
  const { getDailyGroupQuizCompleted } = useProgress();

  const dueCount = useMemo(() => {
    const completed = new Set(getDailyGroupQuizCompleted());
    return wordGroups.filter((g) => !completed.has(g.id)).length;
  }, [getDailyGroupQuizCompleted]);

  useEffect(() => {
    if (typeof window === "undefined" || dueCount === 0 || !("Notification" in window)) {
      return;
    }

    if (!localStorage.getItem(PERMISSION_KEY) && Notification.permission === "default") {
      localStorage.setItem(PERMISSION_KEY, "1");
      Notification.requestPermission().catch(() => undefined);
    }

    if (Notification.permission !== "granted") return;

    const notify = () => {
      if (document.visibilityState === "visible") return;
      new Notification("Daily GRE Quiz Reminder", {
        body: `You still have ${dueCount} group quizzes left today. Keep your streak alive.`,
      });
    };

    const timer = window.setInterval(notify, 45 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [dueCount]);

  if (dueCount === 0) return null;

  return (
    <div className="sticky top-0 z-40 px-3 sm:px-4 md:px-6 py-2 bg-amber-950/30 border-b border-amber-800/50">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs sm:text-sm text-amber-200">
          Daily mission: complete definition quizzes for all groups. {dueCount} group{dueCount === 1 ? "" : "s"} left today.
        </p>
        <Link href="/quiz?daily=1" className="text-xs sm:text-sm px-3 py-1.5 rounded-md bg-amber-200 text-amber-900 font-medium">
          Continue daily quiz
        </Link>
      </div>
    </div>
  );
}
