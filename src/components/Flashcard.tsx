"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Word } from "@/data/words";

export default function Flashcard({
  word,
  onKnown,
  onUnknown,
  showButtons = true,
}: {
  word: Word;
  onKnown?: () => void;
  onUnknown?: () => void;
  showButtons?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight" && flipped && showButtons) {
        e.preventDefault();
        setFlipped(false);
        onKnown?.();
      } else if (e.key === "ArrowLeft" && flipped && showButtons) {
        e.preventDefault();
        setFlipped(false);
        onUnknown?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flipped, showButtons, onKnown, onUnknown]);

  return (
    <div className="w-full max-w-lg mx-auto animate-in">
      <div className="flip-card" onClick={() => setFlipped(!flipped)}>
        <div className={`flip-card-inner ${flipped ? "flipped" : ""}`}>
          <div className="flip-card-front cursor-pointer flex-col text-center">
            <h2 className="text-3xl font-semibold text-zinc-100 capitalize mb-2">
              {word.word}
            </h2>
            <p className="text-zinc-500 text-sm">Click to reveal</p>
          </div>
          <div className="flip-card-back cursor-pointer flex-col text-center">
            <h3 className="text-xl font-medium text-zinc-300 capitalize mb-3">
              {word.word}
            </h3>
            <p className="text-zinc-400 text-base leading-relaxed">
              {word.definition}
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showButtons && flipped && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="flex gap-3 mt-6 justify-center"
          >
          <button
            onClick={() => {
              setFlipped(false);
              onUnknown?.();
            }}
            className="px-5 py-2.5 rounded-lg bg-zinc-900 text-zinc-400 font-medium hover:text-red-400 transition-colors border border-zinc-800"
          >
            <span className="kbd mr-1.5">←</span> Still Learning
          </button>
          <button
            onClick={() => {
              setFlipped(false);
              onKnown?.();
            }}
            className="px-5 py-2.5 rounded-lg bg-zinc-100 text-zinc-900 font-medium hover:bg-zinc-300 transition-colors"
          >
            Got It <span className="kbd ml-1.5 border-zinc-300 text-zinc-500">→</span>
          </button>
          </motion.div>
        )}
      </AnimatePresence>
      {!flipped && showButtons && (
        <p className="text-zinc-700 text-[10px] mt-4 text-center">
          Space to flip
        </p>
      )}
    </div>
  );
}
