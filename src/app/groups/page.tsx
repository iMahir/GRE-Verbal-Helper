"use client";

import Link from "next/link";
import { wordGroups, allWords } from "@/data/words";
import { useProgress } from "@/hooks/useProgress";
import ProgressRing from "@/components/ProgressRing";
import { useState } from "react";

export default function GroupsPage() {
  const { progress } = useProgress();
  const [search, setSearch] = useState("");

  const filtered = search
    ? wordGroups.filter(
        (g) =>
          g.name.toLowerCase().includes(search.toLowerCase()) ||
          g.words.some((w) =>
            w.word.toLowerCase().includes(search.toLowerCase())
          )
      )
    : wordGroups;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Groups</h1>
          <p className="text-zinc-500 text-sm">
            {wordGroups.length} groups · {allWords.length} words
          </p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search groups or words..."
          className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm w-full sm:w-64"
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((group) => {
          const wordIds = group.words.map((w) => w.id);
          const learned = wordIds.filter((id) => progress.words[id]?.known).length;
          const seen = wordIds.filter((id) => progress.words[id]).length;
          const pct = Math.round((learned / group.words.length) * 100);

          return (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className={`card p-4 block transition-colors ${
                pct === 100 ? "border-zinc-600" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">
                    {group.name}
                  </p>
                  <p className="text-xs text-zinc-600">
                    {group.words.length} words
                  </p>
                </div>
                <ProgressRing percentage={pct} size={48} stroke={3} />
              </div>

              <div className="mt-3">
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: pct === 100 ? "var(--foreground)" : pct > 0 ? "var(--muted)" : "var(--border)",
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-[11px] text-zinc-600">
                  <span>{learned} learned</span>
                  <span>{seen} seen</span>
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1">
                {group.words.slice(0, 5).map((w) => {
                  const wp = progress.words[w.id];
                  return (
                    <span
                      key={w.id}
                      className={`text-[11px] px-1.5 py-0.5 rounded ${
                        wp?.known
                          ? "bg-zinc-800 text-zinc-300"
                          : wp
                            ? "bg-zinc-800/50 text-zinc-500"
                            : "bg-zinc-900 text-zinc-600"
                      }`}
                    >
                      {w.word}
                    </span>
                  );
                })}
                {group.words.length > 5 && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-700">
                    +{group.words.length - 5}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-zinc-600 text-sm">No groups match &quot;{search}&quot;</p>
        </div>
      )}
    </div>
  );
}
