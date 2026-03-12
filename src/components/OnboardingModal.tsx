"use client";

import { useState, useEffect } from "react";

const ONBOARDING_KEY = "vm-onboarding-done";

export default function OnboardingModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) setShow(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative card p-6 sm:p-8 max-w-md w-full animate-in border-zinc-700 dark:border-zinc-700">
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">
          Welcome to VerbalHelper
        </h2>
        <p className="text-zinc-400 text-sm mb-5 leading-relaxed">
          Master 1,100+ GRE vocabulary words with AI-powered learning.
        </p>

        <div className="space-y-3 mb-6">
          <div className="flex gap-3 items-start">
            <span className="text-lg mt-0.5">◎</span>
            <div>
              <p className="text-sm font-medium text-zinc-200">Learn</p>
              <p className="text-xs text-zinc-500">AI-generated MCQs with spaced repetition scheduling</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-lg mt-0.5">◫</span>
            <div>
              <p className="text-sm font-medium text-zinc-200">Flashcards</p>
              <p className="text-xs text-zinc-500">Flip cards with keyboard shortcuts (Space, ←, →)</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-lg mt-0.5">✎</span>
            <div>
              <p className="text-sm font-medium text-zinc-200">Quiz</p>
              <p className="text-xs text-zinc-500">Timed quizzes with AI example sentences</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-lg mt-0.5">✦</span>
            <div>
              <p className="text-sm font-medium text-zinc-200">AI Assistant</p>
              <p className="text-xs text-zinc-500">Explore words, get mnemonics, and personalized advice</p>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-zinc-600 mb-4">
          Progress is saved locally. Use keyboard shortcuts for faster navigation.
        </p>

        <button onClick={dismiss} className="btn-primary w-full">
          Get Started
        </button>
      </div>
    </div>
  );
}
