"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { wordGroups, allWords, type Word } from "@/data/words";
import { useProgress } from "@/hooks/useProgress";

type QuizType = "definition" | "word";

interface QuizQuestion {
  word: Word;
  options: string[];
  correctIndex: number;
  type: QuizType;
}

function generateQuestions(
  words: Word[],
  allPool: Word[],
  count: number,
  type: QuizType
): QuizQuestion[] {
  const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, count);

  return shuffled.map((word) => {
    const correct = type === "definition" ? word.definition : word.word;

    const wrongs: string[] = [];
    const poolShuffled = [...allPool]
      .filter((w) => w.id !== word.id)
      .sort(() => Math.random() - 0.5);

    for (const w of poolShuffled) {
      const val = type === "definition" ? w.definition : w.word;
      if (!wrongs.includes(val) && val !== correct) {
        wrongs.push(val);
        if (wrongs.length >= 3) break;
      }
    }

    const options = [correct, ...wrongs].sort(() => Math.random() - 0.5);
    return {
      word,
      options,
      correctIndex: options.indexOf(correct),
      type,
    };
  });
}

export default function QuizPage() {
  const { progress, updateWord, addQuizResult } = useProgress();
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [quizType, setQuizType] = useState<QuizType>("definition");
  const [questionCount, setQuestionCount] = useState(10);
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<(boolean | null)[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [exampleSentence, setExampleSentence] = useState<string | null>(null);
  const [loadingSentence, setLoadingSentence] = useState(false);
  const sentenceCache = useRef<Record<string, string>>({});

  // Load AI sentence cache from localStorage on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem("vm-ai-sentences");
      if (cached) sentenceCache.current = JSON.parse(cached);
    } catch { /* ignore */ }
  }, []);

  const saveSentenceCache = useCallback(() => {
    try {
      localStorage.setItem("vm-ai-sentences", JSON.stringify(sentenceCache.current));
    } catch { /* ignore */ }
  }, []);

  const pool = useMemo(
    () =>
      selectedGroup
        ? wordGroups.find((g) => g.id === selectedGroup)?.words || []
        : allWords,
    [selectedGroup]
  );

  const startQuiz = useCallback(() => {
    const qs = generateQuestions(pool, allWords, questionCount, quizType);
    setQuestions(qs);
    setCurrentQ(0);
    setScore(0);
    setSelected(null);
    setAnswers([]);
    setShowResult(false);
    setStarted(true);
  }, [pool, questionCount, quizType]);

  const handleSelect = useCallback(
    (idx: number) => {
      if (selected !== null) return;
      setSelected(idx);
      const correct = idx === questions[currentQ].correctIndex;
      if (correct) setScore((s) => s + 1);
      setAnswers((prev) => [...prev, correct]);

      updateWord(questions[currentQ].word.id, correct);

      // Lazy-fetch an example sentence
      const wordObj = questions[currentQ].word;
      const cacheKey = wordObj.id;
      if (sentenceCache.current[cacheKey]) {
        setExampleSentence(sentenceCache.current[cacheKey]);
      } else {
        setExampleSentence(null);
        setLoadingSentence(true);
        fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "chat",
            messages: [{
              role: "user",
              content: `Give me one short, vivid example sentence using the word "${wordObj.word}" (meaning: ${wordObj.definition}). The sentence should make the meaning obvious from context. Just the sentence, nothing else. Bold the word in the sentence using **word**.`,
            }],
          }),
        })
          .then((r) => r.json())
          .then((data) => {
            const sentence = data.result || "";
            sentenceCache.current[cacheKey] = sentence;
            saveSentenceCache();
            setExampleSentence(sentence);
          })
          .catch(() => setExampleSentence(null))
          .finally(() => setLoadingSentence(false));
      }
    },
    [selected, questions, currentQ, updateWord]
  );

  const handleNext = useCallback(() => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((p) => p + 1);
      setSelected(null);
      setExampleSentence(null);
    } else {
      const finalScore = score;
      addQuizResult({
        date: new Date().toISOString(),
        score: finalScore,
        total: questions.length,
        groupId: selectedGroup || undefined,
        mode: quizType,
      });
      setShowResult(true);
    }
  }, [currentQ, questions.length, score, selectedGroup, quizType, addQuizResult]);

  // Keyboard shortcuts for quiz
  const selectedRef = useRef<number | null>(null);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  useEffect(() => {
    if (!started || showResult) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (selectedRef.current === null) {
        if (e.key >= "1" && e.key <= "4") {
          e.preventDefault();
          const idx = parseInt(e.key) - 1;
          if (idx < questions[currentQ]?.options.length) handleSelect(idx);
        }
      } else {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNext();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [started, showResult, currentQ, questions, handleSelect, handleNext]);

  // Setup screen
  if (!started) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-semibold text-zinc-100 mb-1">Quiz</h1>
        <p className="text-zinc-500 text-sm mb-8">Test your vocabulary knowledge</p>

        <div className="mb-6">
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Group</h2>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedGroup(null)}
              className={`px-3 py-2 rounded-md text-xs transition-colors ${
                selectedGroup === null
                  ? "bg-zinc-100 text-zinc-900"
                  : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800"
              }`}
            >
              All
            </button>
            {wordGroups.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGroup(g.id)}
                className={`px-3 py-2 rounded-md text-xs transition-colors ${
                  selectedGroup === g.id
                    ? "bg-zinc-100 text-zinc-900"
                    : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800"
                }`}
              >
                {g.id}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Type</h2>
          <div className="grid grid-cols-2 gap-2 max-w-sm">
            <button
              onClick={() => setQuizType("definition")}
              className={`card p-3 text-left ${
                quizType === "definition" ? "border-zinc-500 bg-zinc-900" : ""
              }`}
            >
              <p className="text-sm font-medium text-zinc-200">Definition Match</p>
              <p className="text-[11px] text-zinc-600">Word → pick definition</p>
            </button>
            <button
              onClick={() => setQuizType("word")}
              className={`card p-3 text-left ${
                quizType === "word" ? "border-zinc-500 bg-zinc-900" : ""
              }`}
            >
              <p className="text-sm font-medium text-zinc-200">Word Match</p>
              <p className="text-[11px] text-zinc-600">Definition → pick word</p>
            </button>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Questions</h2>
          <div className="flex gap-1.5">
            {[5, 10, 20, 30].map((n) => (
              <button
                key={n}
                onClick={() => setQuestionCount(n)}
                className={`px-3 py-2 rounded-md text-xs transition-colors ${
                  questionCount === n
                    ? "bg-zinc-100 text-zinc-900"
                    : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button onClick={startQuiz} className="btn-primary px-6 py-2.5">
          Start Quiz
        </button>
      </div>
    );
  }

  // Results screen
  if (showResult) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">Quiz Complete</h2>
        <p className="text-4xl font-bold text-zinc-100 my-4">
          {score}/{questions.length}
        </p>
        <p className="text-zinc-500 text-sm mb-8">
          {pct >= 80
            ? "Excellent — you're mastering these words."
            : pct >= 50
              ? "Good effort. Keep practicing."
              : "Keep going — practice makes progress."}
        </p>

        {answers.some((a) => !a) && (
          <div className="text-left mb-8">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">
              Words to Review
            </h3>
            <div className="space-y-1.5">
              {questions.map((q, i) =>
                !answers[i] ? (
                  <div key={i} className="card p-3">
                    <p className="text-sm font-medium text-zinc-300 capitalize">
                      {q.word.word}
                    </p>
                    <p className="text-xs text-zinc-600">{q.word.definition}</p>
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button onClick={() => setStarted(false)} className="btn-secondary">
            New Quiz
          </button>
          <button onClick={startQuiz} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Active quiz
  const q = questions[currentQ];
  const prompt = q.type === "definition" ? q.word.word : q.word.definition;
  const promptLabel =
    q.type === "definition"
      ? "What does this word mean?"
      : "Which word matches this definition?";

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-8">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <button
          onClick={() => setStarted(false)}
          className="text-zinc-600 hover:text-zinc-300 text-xs"
        >
          ✕ End
        </button>
        <p className="text-[11px] sm:text-xs text-zinc-500">
          {currentQ + 1} / {questions.length}
        </p>
        <p className="text-[11px] sm:text-xs text-zinc-400">{score} correct</p>
      </div>

      <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-6 md:mb-8">
        <div
          className="h-full bg-zinc-400 rounded-full transition-all"
          style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div className="card p-4 md:p-6 text-center mb-4 md:mb-6">
            <p className="text-[10px] md:text-[11px] text-zinc-600 mb-2">{promptLabel}</p>
            <p className={`text-xl font-semibold ${
              q.type === "definition" ? "text-zinc-100 capitalize" : "text-zinc-200"
            }`}>
              {prompt}
            </p>
          </div>

          <div className="space-y-2">
            {q.options.map((opt, i) => {
              let optClass = "card p-3.5 cursor-pointer hover:border-zinc-600";
              if (selected !== null) {
                if (i === q.correctIndex) {
                  optClass = "card p-3.5 border-green-600/60 bg-green-950/30";
                } else if (i === selected && i !== q.correctIndex) {
                  optClass = "card p-3.5 border-red-600/60 bg-red-950/30";
                } else {
                  optClass = "card p-3.5 opacity-40";
                }
              }

              return (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  disabled={selected !== null}
                  className={`${optClass} w-full text-left flex items-center transition-all ${
                    q.type === "word" ? "capitalize font-medium text-zinc-200" : "text-sm text-zinc-300"
                  }`}
                >
                  <span className="text-zinc-600 mr-3 font-mono text-xs">
                    <span className="kbd mr-1">{i + 1}</span>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                  {selected !== null && i === q.correctIndex && (
                    <span className="ml-auto pl-2 text-green-400 text-xs font-medium whitespace-nowrap">Correct answer</span>
                  )}
                  {selected !== null && i === selected && i !== q.correctIndex && (
                    <span className="ml-auto pl-2 text-red-400 text-xs font-medium whitespace-nowrap">Your pick</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Word Details panel */}
          {selected !== null && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-6"
            >
          <div className="card p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="text-base font-semibold text-zinc-100 capitalize">{q.word.word}</p>
              <span className="text-[11px] text-zinc-700">Group {q.word.group}</span>
            </div>
            <p className="text-sm text-zinc-300">{q.word.definition}</p>

            {/* AI example sentence */}
            {loadingSentence && (
              <div className="flex items-center gap-2 pt-1">
                <div className="animate-spin w-3 h-3 border border-zinc-600 border-t-transparent rounded-full" />
                <span className="text-xs text-zinc-600">Generating example...</span>
              </div>
            )}
            {exampleSentence && !loadingSentence && (
              <div className="pt-1 border-t border-zinc-800">
                <p className="text-xs text-zinc-600 mb-1">Example</p>
                <p className="text-sm text-zinc-400 italic leading-relaxed">
                  {exampleSentence.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
                    part.startsWith("**") && part.endsWith("**")
                      ? <strong key={j} className="text-zinc-200 not-italic font-semibold">{part.slice(2, -2)}</strong>
                      : <span key={j}>{part}</span>
                  )}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleNext}
            className="btn-primary mt-4 w-full"
          >
            {currentQ < questions.length - 1 ? "Next Question" : "See Results"}
            <span className="ml-2 inline-flex items-center justify-center min-w-[1.5rem] h-[1.5rem] px-1 rounded text-[10px] bg-zinc-900 text-zinc-300 border border-zinc-700">↵</span>
          </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
