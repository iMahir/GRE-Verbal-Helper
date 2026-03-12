"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/learn", label: "Learn" },
  { href: "/groups", label: "Groups" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/quiz", label: "Quiz" },
  { href: "/ai", label: "AI" },
  { href: "/weak-words", label: "Review" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  if (pathname === "/login") return null;

  return (
    <>
      {/* Desktop top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass hidden md:block">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="text-lg font-thin tracking-wide text-theme-fg">
              VerbalHelper
            </Link>
            <div className="flex items-center gap-0.5">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                    pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))
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

      {/* Mobile bottom nav */}
      <div className="bottom-nav md:hidden">
        <div className="flex items-center justify-around px-1">
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            const icons: Record<string, string> = { "/": "◉", "/learn": "◎", "/groups": "▦", "/flashcards": "◫", "/quiz": "✎", "/ai": "◆", "/weak-words": "↻" };
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center gap-0.5 py-2 px-1.5 min-w-[40px] text-[10px] font-medium transition-colors ${
                  active ? "text-zinc-100" : "text-zinc-600"
                }`}
              >
                <span className="text-sm">{icons[link.href]}</span>
                {link.label}
              </Link>
            );
          })}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="flex flex-col items-center gap-0.5 py-2 px-1.5 min-w-[40px] text-[10px] font-medium text-zinc-600 transition-colors"
            >
              <span className="text-sm">{theme === "dark" ? "☀" : "☾"}</span>
              Theme
            </button>
          )}
          {user && (
            <button
              onClick={logout}
              className="flex flex-col items-center gap-0.5 py-2 px-1.5 min-w-[40px] text-[10px] font-medium text-zinc-600 transition-colors"
            >
              <span className="text-sm">⏻</span>
              Out
            </button>
          )}
        </div>
      </div>
    </>
  );
}
