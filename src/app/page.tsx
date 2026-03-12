"use client";

import Link from "next/link";
import { useProgress } from "@/hooks/useProgress";
import { wordGroups, allWords } from "@/data/words";
import ProgressRing from "@/components/ProgressRing";
import { useMemo } from "react";

export default function Dashboard() {
  const { progress } = useProgress();

  const stats = useMemo(() => {
    const totalWords = allWords.length;
    const wordsLearned = Object.values(progress.words).filter(
      (w) => w.known
    ).length;
    const wordsSeen = Object.keys(progress.words).length;
    const hardWords = Object.values(progress.words).filter(
      (w) => w.difficulty === "hard"
    ).length;
    const reviewDue = Object.values(progress.words).filter(
      (w) => w.known && w.nextReview && w.nextReview <= Date.now()
    ).length;
    const avgScore =
      progress.quizHistory.length > 0
        ? Math.round(
            progress.quizHistory.reduce(
              (acc, q) => acc + (q.score / q.total) * 100,
              0
            ) / progress.quizHistory.length
          )
        : 0;

    return { totalWords, wordsLearned, wordsSeen, hardWords, reviewDue, avgScore };
  }, [progress]);

  const recentGroups = useMemo(() => {
    const seen = new Map<number, number>();
    Object.values(progress.words).forEach((w) => {
      const word = allWords.find((aw) => aw.id === w.wordId);
      if (word) {
        const current = seen.get(word.group) || 0;
        seen.set(word.group, Math.max(current, w.lastSeen));
      }
    });
    return Array.from(seen.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([groupId]) => wordGroups.find((g) => g.id === groupId)!)
      .filter(Boolean);
  }, [progress]);

  // Heatmap data (last 12 weeks)
  const heatmapData = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    const today = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const activity = progress.activityLog?.find((a) => a.date === dateStr);
      days.push({ date: dateStr, count: activity?.count || 0 });
    }
    return days;
  }, [progress]);

  // Quiz score trend (last 10)
  const quizTrend = useMemo(() => {
    return progress.quizHistory.slice(-10).map((q) => ({
      score: Math.round((q.score / q.total) * 100),
      date: new Date(q.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
    }));
  }, [progress]);

  const overallPercent = Math.round(
    (stats.wordsLearned / stats.totalWords) * 100
  );

  const dailyGoal = progress.dailyGoal;
  const dailyPercent = dailyGoal.target > 0
    ? Math.min(100, Math.round((dailyGoal.wordsToday / dailyGoal.target) * 100))
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 mb-1">Dashboard</h1>
        <p className="text-zinc-500 text-xs sm:text-sm">
          {stats.totalWords} words · {wordGroups.length} groups
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3 mb-6 md:mb-8">
        <StatCard label="Learned" value={stats.wordsLearned} sub={`/ ${stats.totalWords}`} />
        <StatCard label="Seen" value={stats.wordsSeen} sub={`${Math.round((stats.wordsSeen / stats.totalWords) * 100)}%`} />
        <StatCard label="Streak" value={progress.dailyStreak} sub="days" />
        <StatCard label="Avg Score" value={`${stats.avgScore}%`} sub={`${progress.quizHistory.length} quizzes`} />
        <StatCard label="Review Due" value={stats.reviewDue} sub={stats.hardWords > 0 ? `${stats.hardWords} hard` : "on track"} />
      </div>

      <div className="grid md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        {/* Progress + Daily Goal */}
        <div className="card p-4 md:p-5">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h3 className="text-xs md:text-sm font-medium text-zinc-400">Progress</h3>
            <ProgressRing percentage={overallPercent} size={56} stroke={4} />
          </div>
          <p className="text-zinc-500 text-xs mb-3 md:mb-4">
            {stats.wordsLearned} of {stats.totalWords} mastered
          </p>

          {/* Daily goal bar */}
          <div className="pt-3 md:pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500">Today&apos;s goal</span>
              <span className="text-xs text-zinc-400 font-medium">{dailyGoal.wordsToday}/{dailyGoal.target}</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-100 rounded-full transition-all duration-500"
                style={{ width: `${dailyPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="card p-4 md:p-5">
          <h3 className="text-xs md:text-sm font-medium text-zinc-400 mb-2 md:mb-3">Quick Start</h3>
          <div className="space-y-1.5">
            <Link href="/learn" className="block p-2.5 md:p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 transition-colors">
              <p className="text-xs md:text-sm font-medium text-zinc-200">Learn Words</p>
              <p className="text-[11px] md:text-xs text-zinc-600">AI-powered quizzes</p>
            </Link>
            <Link href="/flashcards" className="block p-2.5 md:p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 transition-colors">
              <p className="text-xs md:text-sm font-medium text-zinc-200">Flashcards</p>
              <p className="text-[11px] md:text-xs text-zinc-600">Review with flip cards</p>
            </Link>
            <Link href="/quiz" className="block p-2.5 md:p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 transition-colors">
              <p className="text-xs md:text-sm font-medium text-zinc-200">Quiz</p>
              <p className="text-[11px] md:text-xs text-zinc-600">Test your knowledge</p>
            </Link>
            {stats.reviewDue > 0 && (
              <Link href="/weak-words" className="block p-2.5 md:p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 transition-colors">
                <p className="text-xs md:text-sm font-medium text-zinc-200">Review Due</p>
                <p className="text-[11px] md:text-xs text-zinc-600">{stats.reviewDue} words need review</p>
              </Link>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card p-4 md:p-5">
          <h3 className="text-xs md:text-sm font-medium text-zinc-400 mb-2 md:mb-3">
            {recentGroups.length > 0 ? "Recent Groups" : "Get Started"}
          </h3>
          {recentGroups.length > 0 ? (
            <div className="space-y-1.5">
              {recentGroups.map((g) => {
                const gp = Object.values(progress.words).filter((w) => {
                  const word = allWords.find((aw) => aw.id === w.wordId);
                  return word?.group === g.id;
                });
                const learned = gp.filter((w) => w.known).length;
                return (
                  <Link key={g.id} href={`/groups/${g.id}`} className="block p-2 md:p-2.5 rounded-lg hover:bg-zinc-900 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="text-xs md:text-sm text-zinc-300 truncate">{g.name}</span>
                      <span className="text-[10px] md:text-xs text-zinc-600 ml-2 whitespace-nowrap">{learned}/{g.words.length}</span>
                    </div>
                    <div className="mt-1.5 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-zinc-500 rounded-full transition-all" style={{ width: `${(learned / g.words.length) * 100}%` }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-zinc-600 text-xs mb-2">Start learning to track progress</p>
              <Link href="/groups" className="btn-primary text-xs">Browse Groups</Link>
            </div>
          )}
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="card p-4 md:p-5 mb-6 md:mb-8">
        <h3 className="text-xs md:text-sm font-medium text-zinc-400 mb-3">Activity</h3>
        <div className="flex flex-wrap gap-[2px] sm:gap-[3px] overflow-x-auto pb-2">
          {heatmapData.map((d) => {
            const level = d.count === 0 ? "" : d.count <= 3 ? "l1" : d.count <= 8 ? "l2" : d.count <= 15 ? "l3" : d.count <= 25 ? "l4" : "l5";
            return (
              <div
                key={d.date}
                className={`heatmap-cell ${level} flex-shrink-0`}
                title={`${d.date}: ${d.count} words`}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-1 mt-3 text-[9px] sm:text-[10px] text-zinc-600 overflow-x-auto pb-1">
          <span>Less</span>
          <div className="heatmap-cell flex-shrink-0" />
          <div className="heatmap-cell l1 flex-shrink-0" />
          <div className="heatmap-cell l2 flex-shrink-0" />
          <div className="heatmap-cell l3 flex-shrink-0" />
          <div className="heatmap-cell l4 flex-shrink-0" />
          <div className="heatmap-cell l5 flex-shrink-0" />
          <span>More</span>
        </div>
      </div>

      {/* Quiz Score Trend */}
      {quizTrend.length > 0 && (
        <div className="card p-4 md:p-5 mb-6 md:mb-8">
          <h3 className="text-xs md:text-sm font-medium text-zinc-400 mb-3">Quiz Scores</h3>
          <div className="flex items-end gap-1.5 md:gap-2 h-20 md:h-24">
            {quizTrend.map((q, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] md:text-[10px] text-zinc-500">{q.score}%</span>
                <div className="w-full rounded-sm bg-zinc-800 relative" style={{ height: "48px" }}>
                  <div
                    className="absolute bottom-0 w-full rounded-sm transition-all"
                    style={{ height: `${q.score}%`, background: q.score >= 80 ? "var(--foreground)" : q.score >= 50 ? "var(--muted)" : "var(--border)" }}
                  />
                </div>
                <span className="text-[8px] md:text-[9px] text-zinc-600">{q.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Groups Grid */}
      <div className="mb-3 md:mb-4 flex items-center justify-between">
        <h2 className="text-xs md:text-sm font-medium text-zinc-400">All Groups</h2>
        <Link href="/groups" className="text-zinc-600 hover:text-zinc-400 text-[11px] md:text-xs">View All</Link>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5 md:gap-2">
        {wordGroups.map((g) => {
          const gWords = g.words.map((w) => w.id);
          const learned = gWords.filter((id) => progress.words[id]?.known).length;
          const pct = Math.round((learned / g.words.length) * 100);
          return (
            <Link key={g.id} href={`/groups/${g.id}`} className={`card p-2 md:p-2.5 text-center hover:bg-zinc-900 transition-colors ${pct === 100 ? "border-zinc-600" : ""}`}>
              <p className="text-sm md:text-lg font-medium text-zinc-300">{g.id}</p>
              <div className="mt-1 md:mt-1.5 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? "var(--foreground)" : pct > 0 ? "var(--muted)" : "var(--border)" }} />
              </div>
              <p className="text-[9px] md:text-[10px] text-zinc-600 mt-0.5 md:mt-1">{learned}/{g.words.length}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="card p-3 sm:p-4">
      <p className="text-[10px] sm:text-[11px] text-zinc-600 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg sm:text-xl font-semibold text-zinc-100">{value}</p>
      <p className="text-[11px] sm:text-xs text-zinc-600">{sub}</p>
    </div>
  );
}
