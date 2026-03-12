"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { allWords, searchWords } from "@/data/words";
import { useProgress } from "@/hooks/useProgress";

interface Message {
  role: "user" | "assistant";
  content: string;
}

async function aiRequest(body: Record<string, unknown>): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data.result;
}

/* ---------- Icons ---------- */
const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
  </svg>
);
const SparkleIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07-2.83 2.83M9.76 14.24l-2.83 2.83m11.14 0-2.83-2.83M9.76 9.76 6.93 6.93" strokeLinecap="round" />
  </svg>
);
const ChatIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const LightbulbIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path d="M9 18h6m-5 4h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const BookIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const LinkIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const MemoryIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CompareIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path d="M16 3h5v5M8 3H3v5m18 8v5h-5M3 16v5h5M21 3 3 21M3 3l18 18" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ---------- Formatted AI text renderer ---------- */
function FormattedText({ text }: { text: string }) {
  const parsed = useMemo(() => {
    try {
      const trimmed = text.trim();
      if (trimmed.startsWith("{")) {
        return JSON.parse(trimmed);
      }
    } catch { /* not JSON */ }
    return null;
  }, [text]);

  if (parsed && (parsed.synonyms || parsed.antonyms)) {
    return (
      <div className="space-y-4">
        {parsed.synonyms?.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-zinc-500 mb-2 uppercase tracking-wider">Synonyms</p>
            <div className="flex flex-wrap gap-1.5">
              {parsed.synonyms.map((s: string) => (
                <span key={s} className="px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm capitalize">{s}</span>
              ))}
            </div>
          </div>
        )}
        {parsed.antonyms?.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-zinc-500 mb-2 uppercase tracking-wider">Antonyms</p>
            <div className="flex flex-wrap gap-1.5">
              {parsed.antonyms.map((a: string) => (
                <span key={a} className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm capitalize">{a}</span>
              ))}
            </div>
          </div>
        )}
        {parsed.usage_note && (
          <div>
            <p className="text-[11px] font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">GRE Usage Note</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{parsed.usage_note}</p>
          </div>
        )}
      </div>
    );
  }

  const lines = text.split("\n");

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        const isBullet = /^[-•*]\s+/.test(trimmed);
        const isNumbered = /^\d+[.)]\s+/.test(trimmed);
        const content = isBullet
          ? trimmed.replace(/^[-•*]\s+/, "")
          : isNumbered
            ? trimmed.replace(/^\d+[.)]\s+/, "")
            : trimmed;

        const parts = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
        const rendered = parts.map((part, j) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={j} className="text-zinc-100 font-semibold">{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
            return <em key={j} className="text-zinc-300 italic">{part.slice(1, -1)}</em>;
          }
          return <span key={j}>{part}</span>;
        });

        if (isBullet || isNumbered) {
          const marker = isNumbered ? trimmed.match(/^(\d+[.)])/)?.[1] || "•" : "•";
          return (
            <div key={i} className="flex gap-2.5 pl-1">
              <span className="text-zinc-600 mt-0.5 shrink-0 text-sm min-w-[1rem] text-right">{marker}</span>
              <p className="text-sm text-zinc-300 leading-relaxed">{rendered}</p>
            </div>
          );
        }

        return <p key={i} className="text-sm text-zinc-300 leading-relaxed">{rendered}</p>;
      })}
    </div>
  );
}

/* ---------- Skeleton loader ---------- */
function Skeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3.5 rounded bg-zinc-800" style={{ width: `${65 + Math.random() * 35}%` }} />
      ))}
    </div>
  );
}

/* ---------- Main page ---------- */
export default function AIPage() {
  const { progress } = useProgress();
  const [activeTab, setActiveTab] = useState<"chat" | "explore" | "recommend">("explore");
  const [wordInput, setWordInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [compareWord, setCompareWord] = useState("");
  const [showCompare, setShowCompare] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vm-ai-recent");
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const addRecentSearch = useCallback((word: string) => {
    setRecentSearches((prev) => {
      const next = [word, ...prev.filter((w) => w !== word)].slice(0, 8);
      localStorage.setItem("vm-ai-recent", JSON.stringify(next));
      return next;
    });
  }, []);

  // Random suggested words (client-only to avoid hydration mismatch)
  const [suggestedWords, setSuggestedWords] = useState<typeof allWords>([]);
  useEffect(() => {
    setSuggestedWords(allWords.sort(() => Math.random() - 0.5).slice(0, 10));
  }, []);

  const selectedWordData = useMemo(() => {
    if (!wordInput) return null;
    return allWords.find((w) => w.word.toLowerCase() === wordInput.toLowerCase()) || null;
  }, [wordInput]);

  useEffect(() => {
    if (wordInput.length >= 2) {
      const matches = searchWords(wordInput).slice(0, 8);
      setSuggestions(matches.map((w) => w.word));
    } else {
      setSuggestions([]);
    }
  }, [wordInput]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const handleExplore = async (action: string, word: string, definition?: string) => {
    setLoading(true);
    setActiveAction(action);
    setResult(null);
    addRecentSearch(word);
    try {
      const text = await aiRequest({ action, word, definition });
      setResult(text);
    } catch {
      setResult("Failed to get AI response. Please try again.");
    }
    setLoading(false);
  };

  const handleCompare = async () => {
    if (!wordInput.trim() || !compareWord.trim()) return;
    setLoading(true);
    setActiveAction("compare");
    setResult(null);
    addRecentSearch(wordInput);
    addRecentSearch(compareWord);
    try {
      const text = await aiRequest({
        action: "compare",
        word: `${wordInput} vs ${compareWord}`,
      });
      setResult(text);
    } catch {
      setResult("Failed to compare words. Please try again.");
    }
    setLoading(false);
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg: Message = { role: "user", content: chatInput };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setChatInput("");
    setLoading(true);
    try {
      const text = await aiRequest({ action: "chat", messages: newMessages });
      setMessages([...newMessages, { role: "assistant", content: text }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Sorry, I had trouble responding. Please try again." }]);
    }
    setLoading(false);
  };

  const handleRecommend = async () => {
    setLoading(true);
    setResult(null);
    const known = Object.entries(progress.words)
      .filter(([, v]) => v.known)
      .map(([id]) => {
        const w = allWords.find((w) => w.id === id);
        return w?.word || id;
      });
    const level = known.length > 500 ? "advanced" : known.length > 200 ? "intermediate" : "beginner";
    try {
      const text = await aiRequest({ action: "recommend", words: known, userLevel: level });
      setResult(text);
    } catch {
      setResult("Failed to get recommendations. Please try again.");
    }
    setLoading(false);
  };

  const tabs = [
    { key: "explore" as const, label: "Explore", icon: <SearchIcon /> },
    { key: "chat" as const, label: "Chat", icon: <ChatIcon /> },
    { key: "recommend" as const, label: "Advice", icon: <LightbulbIcon /> },
  ];

  const exploreActions = [
    { action: "explain", label: "Explain", icon: <BookIcon />, desc: "Definition, etymology & mnemonic" },
    { action: "synonyms", label: "Synonyms", icon: <LinkIcon />, desc: "Synonyms, antonyms & usage" },
    { action: "sentence", label: "Sentences", icon: <ChatIcon />, desc: "GRE-style example sentences" },
    { action: "mnemonic", label: "Mnemonic", icon: <MemoryIcon />, desc: "Memory trick to remember" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
          <SparkleIcon />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">AI Assistant</h1>
        </div>
      </div>
      <p className="text-zinc-500 text-sm mb-6 ml-12">Explore words, chat, or get personalized advice</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-900 p-1 rounded-lg w-fit border border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setResult(null); }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ======================== EXPLORE TAB ======================== */}
      {activeTab === "explore" && (
        <div>
          {/* Search input */}
          <div className="relative mb-4">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
              <SearchIcon />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              placeholder="Search any GRE word..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
            />
            {wordInput && (
              <button
                onClick={() => { setWordInput(""); setResult(null); setSuggestions([]); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 text-lg"
              >
                ×
              </button>
            )}
            {suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setWordInput(s); setSuggestions([]); }}
                    className="w-full text-left px-4 py-2.5 text-zinc-300 hover:bg-zinc-800 capitalize text-sm flex items-center gap-2 transition-colors"
                  >
                    <span className="text-zinc-600"><SearchIcon /></span>
                    {s}
                    {(() => {
                      const match = allWords.find((w) => w.word === s);
                      return match ? <span className="ml-auto text-zinc-600 text-xs truncate max-w-[50%]">{match.definition}</span> : null;
                    })()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected word preview card */}
          {selectedWordData && suggestions.length === 0 && (
            <div className="card p-4 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-zinc-100 capitalize">{selectedWordData.word}</h2>
                  <p className="text-sm text-zinc-400 mt-0.5 leading-relaxed">{selectedWordData.definition}</p>
                </div>
                <button
                  onClick={() => setShowCompare(!showCompare)}
                  className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] border transition-colors ${
                    showCompare
                      ? "bg-zinc-800 border-zinc-600 text-zinc-200"
                      : "border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  <CompareIcon />
                  Compare
                </button>
              </div>

              {/* Compare input */}
              {showCompare && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={compareWord}
                    onChange={(e) => setCompareWord(e.target.value)}
                    placeholder="Compare with..."
                    className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:border-zinc-600"
                  />
                  <button
                    onClick={handleCompare}
                    disabled={loading || !compareWord.trim()}
                    className="btn-primary px-4 text-sm disabled:opacity-50"
                  >
                    Compare
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action buttons — grid when word selected */}
          {wordInput && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              {exploreActions.map((btn) => (
                <button
                  key={btn.action}
                  onClick={() => handleExplore(btn.action, wordInput, selectedWordData?.definition)}
                  disabled={loading}
                  className={`group flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all disabled:opacity-50 ${
                    activeAction === btn.action && result
                      ? "bg-zinc-800 border-zinc-600 text-zinc-100"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    {btn.icon}
                    {btn.label}
                  </div>
                  <p className="text-[10px] text-zinc-600 group-hover:text-zinc-500 leading-tight">{btn.desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="card p-6">
              <Skeleton lines={5} />
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div className="card p-5 animate-in">
              <FormattedText text={result} />
            </div>
          )}

          {/* Empty state: recent + suggested */}
          {!wordInput && (
            <div className="space-y-6">
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Recent</h3>
                    <button
                      onClick={() => { setRecentSearches([]); localStorage.removeItem("vm-ai-recent"); }}
                      className="text-[10px] text-zinc-600 hover:text-zinc-400"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.map((w) => (
                      <button
                        key={w}
                        onClick={() => setWordInput(w)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs hover:text-zinc-100 hover:border-zinc-600 capitalize transition-colors"
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2.5">
                  Suggested words
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {suggestedWords.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setWordInput(w.word)}
                      className="flex flex-col items-start p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/60 transition-colors text-left group"
                    >
                      <span className="text-xs font-medium text-zinc-300 group-hover:text-zinc-100 capitalize">{w.word}</span>
                      <span className="text-[10px] text-zinc-600 truncate w-full mt-0.5">{w.definition}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================== CHAT TAB ======================== */}
      {activeTab === "chat" && (
        <div className="card flex flex-col overflow-hidden" style={{ height: "65vh" }}>
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 mb-4">
                  <ChatIcon />
                </div>
                <p className="text-zinc-300 font-medium text-sm mb-1">GRE Vocabulary Chat</p>
                <p className="text-zinc-600 text-xs mb-5 max-w-xs">
                  Ask about word meanings, compare confusing pairs, get mnemonics, or plan your study
                </p>
                <div className="flex flex-col gap-1.5 w-full max-w-sm">
                  {[
                    "What's the difference between 'ambiguous' and 'ambivalent'?",
                    "Help me remember the word 'ephemeral'",
                    "Give me a study plan for this week",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => setChatInput(q)}
                      className="text-left text-xs px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${
                    msg.role === "user"
                      ? "bg-zinc-100 text-zinc-900 rounded-br-sm"
                      : "bg-zinc-800 text-zinc-300 rounded-bl-sm border border-zinc-700"
                  }`}
                >
                  {msg.role === "assistant" ? <FormattedText text={msg.content} /> : <p className="whitespace-pre-wrap">{msg.content}</p>}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 border border-zinc-700 px-4 py-3 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-zinc-800 bg-zinc-900/50">
            <form onSubmit={(e) => { e.preventDefault(); handleChat(); }} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about GRE vocabulary..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !chatInput.trim()}
                className="btn-primary px-3.5 disabled:opacity-50 flex items-center"
              >
                <SendIcon />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================== ADVICE TAB ======================== */}
      {activeTab === "recommend" && (
        <div>
          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { value: Object.values(progress.words).filter((w) => w.known).length, label: "Words Learned", color: "text-green-400" },
              { value: Object.values(progress.words).filter((w) => w.difficulty === "hard").length, label: "Hard Words", color: "text-amber-400" },
              { value: progress.quizHistory.length, label: "Quizzes Taken", color: "text-blue-400" },
            ].map((stat) => (
              <div key={stat.label} className="card p-4 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Progress context */}
          <div className="card p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500">Overall progress</span>
              <span className="text-xs text-zinc-400 font-medium">
                {Object.values(progress.words).filter((w) => w.known).length} / {allWords.length}
              </span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-100 rounded-full transition-all duration-500"
                style={{ width: `${(Object.values(progress.words).filter((w) => w.known).length / allWords.length) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-600 mt-2">
              {Object.values(progress.words).filter((w) => w.known).length > 500
                ? "Advanced level — you know most words! Focus on edge cases."
                : Object.values(progress.words).filter((w) => w.known).length > 200
                  ? "Intermediate level — solid progress. Keep pushing!"
                  : "Beginner level — great time to build a strong foundation."}
            </p>
          </div>

          <button
            onClick={handleRecommend}
            disabled={loading}
            className="btn-primary w-full py-3 mb-5 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <SparkleIcon />
            {loading ? "Analyzing your progress..." : "Get Personalized Recommendations"}
          </button>

          {loading && (
            <div className="card p-6">
              <Skeleton lines={6} />
            </div>
          )}

          {result && !loading && (
            <div className="card p-5 animate-in">
              <h3 className="text-sm font-medium text-zinc-200 mb-3 flex items-center gap-2">
                <SparkleIcon />
                AI Recommendations
              </h3>
              <FormattedText text={result} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
