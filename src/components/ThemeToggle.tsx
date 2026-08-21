"use client";

import { THEME_KEY } from "@/lib/storage-keys";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const toggle = () => {
    try {
      const isDark = document.documentElement.classList.toggle("dark");
      localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className={`text-muted transition-colors hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      aria-label="Alternar tema claro/escuro"
      title="Alternar tema"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className="w-4 h-4">
        <rect x="8" y="8" width="8" height="8" />
        <path d="M11 2h2v3h-2zM11 19h2v3h-2zM2 11h3v2H2zM19 11h3v2h-3z" fill="currentColor" stroke="none" />
        <path d="M4 4h3v3H4zM17 4h3v3h-3zM4 17h3v3H4zM17 17h3v3h-3z" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}
