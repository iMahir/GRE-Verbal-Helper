"use client";

import { useRef, useEffect, useState } from "react";
import { wordGroups } from "@/data/words";

interface GroupSelectorProps {
  selectedGroup: number | null;
  onSelect: (group: number | null) => void;
  /** Optional: show learned count per group */
  learnedCounts?: Record<number, number>;
}

export default function GroupSelector({ selectedGroup, onSelect, learnedCounts }: GroupSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      setShowFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll selected chip into view on mount
  useEffect(() => {
    if (selectedGroup === null || !scrollRef.current) return;
    const chip = scrollRef.current.querySelector(`[data-group="${selectedGroup}"]`);
    if (chip) chip.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [selectedGroup]);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin md:flex-wrap md:overflow-x-visible md:pb-0"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <button
          onClick={() => onSelect(null)}
          className={`group-chip ${selectedGroup === null ? "group-chip-active" : "group-chip-idle"}`}
        >
          All
        </button>
        {wordGroups.map((g) => {
          const count = learnedCounts?.[g.id];
          return (
            <button
              key={g.id}
              data-group={g.id}
              onClick={() => onSelect(g.id)}
              className={`group-chip ${selectedGroup === g.id ? "group-chip-active" : "group-chip-idle"}`}
            >
              {g.id}
              {count !== undefined && count > 0 && (
                <span className="ml-0.5 opacity-50">({count})</span>
              )}
            </button>
          );
        })}
      </div>
      {/* Fade hint for scrollability on mobile */}
      {showFade && (
        <div className="absolute right-0 top-0 bottom-2 w-8 pointer-events-none bg-gradient-to-l from-[var(--background)] to-transparent md:hidden" />
      )}
    </div>
  );
}
