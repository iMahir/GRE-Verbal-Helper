"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";

const allLinks = [
  { href: "/", label: "Dashboard", icon: "◉" },
  { href: "/learn", label: "Learn", icon: "◎" },
  { href: "/groups", label: "Groups", icon: "▦" },
  { href: "/flashcards", label: "Flashcards", icon: "◫" },
  { href: "/quiz", label: "Quiz", icon: "✎" },
  { href: "/ai", label: "AI", icon: "◆" },
  { href: "/weak-words", label: "Review", icon: "↻" },
];

// Primary tabs shown directly in the bottom bar
const primaryLinks = allLinks.filter((l) =>
  ["/", "/learn", "/flashcards"].includes(l.href)
);

// Remaining links go inside the "More" sheet
const moreLinks = allLinks.filter(
  (l) => !["/", "/learn", "/flashcards"].includes(l.href)
);

export default function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close sheet on route change
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  // Close sheet on Escape
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setMoreOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [moreOpen]);

  const toggleTheme = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme]
  );

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  // Is any "more" link active? If so, highlight the More tab
  const moreActive = moreLinks.some((l) => isActive(l.href));

  if (pathname === "/login") return null;

  return (
    <>
      {/* Desktop top nav — unchanged */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass hidden md:block">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="text-lg font-thin tracking-wide text-theme-fg">
              VerbalHelper
            </Link>
            <div className="flex items-center gap-0.5">
              {allLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                    isActive(link.href)
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {mounted && (
                <button
                  onClick={toggleTheme}
                  className="ml-2 p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors"
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  )}
                </button>
              )}
              {user && (
                <button
                  onClick={logout}
                  className="ml-1 p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors"
                  aria-label="Sign out"
                  title={`Signed in as ${user.username}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav — 4 items */}
      <div className="bottom-nav md:hidden">
        <div className="flex items-center justify-around px-2">
          {primaryLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`mobile-tab ${active ? "text-zinc-100" : "text-zinc-600"}`}
              >
                <span className="text-base">{link.icon}</span>
                <span>{link.href === "/" ? "Home" : link.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`mobile-tab ${moreActive || moreOpen ? "text-zinc-100" : "text-zinc-600"}`}
            aria-label="More options"
          >
            <span className="text-base">☰</span>
            <span>More</span>
          </button>
        </div>
      </div>

      {/* More sheet overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setMoreOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm more-backdrop-in" />

          {/* Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 more-sheet-in"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[var(--card)] border-t border-[var(--border)] rounded-t-2xl">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
              </div>

              {/* Links */}
              <div className="px-4 pb-2">
                {moreLinks.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg min-h-[48px] transition-colors ${
                        active
                          ? "bg-[var(--card-hover)] text-zinc-100"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-[var(--card-hover)]"
                      }`}
                    >
                      <span className="text-lg w-6 text-center">{link.icon}</span>
                      <span className="text-sm font-medium">{link.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Theme + Logout */}
              <div className="px-4 pb-4 pt-1 border-t border-[var(--border)] mx-3">
                {mounted && (
                  <button
                    onClick={toggleTheme}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg min-h-[48px] w-full text-zinc-400 hover:text-zinc-200 hover:bg-[var(--card-hover)] transition-colors"
                  >
                    <span className="text-lg w-6 text-center">{theme === "dark" ? "☀" : "☾"}</span>
                    <span className="text-sm font-medium">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                  </button>
                )}
                {user && (
                  <button
                    onClick={() => { logout(); setMoreOpen(false); }}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg min-h-[48px] w-full text-zinc-400 hover:text-zinc-200 hover:bg-[var(--card-hover)] transition-colors"
                  >
                    <span className="text-lg w-6 text-center">⏻</span>
                    <span className="text-sm font-medium">Sign Out</span>
                    {user.username && (
                      <span className="ml-auto text-xs text-zinc-600">{user.username}</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
