"use client";

// All / Stories / Podcasts / Library switch. The white pill slides to the clicked tab
// right away, and the bar never changes size. Switching filters keeps your place on the
// page; if you scrolled past the tabs, it glides back so the new list starts in view.

import { useRouter } from "next/navigation";
import { startTransition, useOptimistic, useRef } from "react";

const FILTERS = [
  { key: "", label: "All" },
  { key: "article", label: "Stories" },
  { key: "podcast", label: "Podcasts" },
];
const LIBRARY = { key: "library", label: "Library" };

// current: "" | "article" | "podcast" | "library"
export default function FilterTabs({ current, showLibrary }: { current: string; showLibrary: boolean }) {
  const router = useRouter();
  const tabs = showLibrary ? [...FILTERS, LIBRARY] : FILTERS;
  // Shows the clicked tab immediately, while the new content loads in the background.
  const [active, setActive] = useOptimistic(current);
  const index = Math.max(0, tabs.findIndex((tab) => tab.key === active));
  const navRef = useRef<HTMLElement>(null);

  function select(key: string) {
    if (key === active) return;
    const toLibrary = key === LIBRARY.key;
    const fromLibrary = active === LIBRARY.key;

    const nav = navRef.current;
    if (!toLibrary && !fromLibrary && nav && nav.getBoundingClientRect().top < 64) {
      // Tabs are hidden under the header: glide back so they sit just below it.
      window.scrollTo({ top: window.scrollY + nav.getBoundingClientRect().top - 80, behavior: "smooth" });
    }
    startTransition(() => {
      setActive(key);
      if (toLibrary) router.push("/library");
      // Between filters on the same page: keep the scroll position.
      else router.push(key ? `/?type=${key}` : "/", { scroll: fromLibrary });
    });
  }

  return (
    <nav
      ref={navRef}
      aria-label="Filter"
      className="relative rounded-full bg-black/5"
      // All layout inline, so it never depends on a stylesheet: equal columns inside a
      // fixed width (104px per tab, or the full width on small phones).
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
        width: `min(100%, ${tabs.length * 104 + 8}px)`,
        padding: 4,
      }}
    >
      {/* The sliding white pill: exactly one column wide */}
      <span
        aria-hidden
        className="rounded-full bg-white shadow-sm"
        style={{
          position: "absolute",
          top: 4,
          bottom: 4,
          left: 4,
          width: `calc((100% - 8px) / ${tabs.length})`,
          transform: `translateX(${index * 100}%)`,
          transition: "transform 300ms ease-out",
        }}
      />
      {tabs.map((tab) => (
        <button
          key={tab.label}
          onClick={() => select(tab.key)}
          aria-pressed={tab.key === active}
          style={{
            position: "relative",
            zIndex: 1,
            padding: "6px 0",
            textAlign: "center",
            whiteSpace: "nowrap",
            fontSize: 14,
            letterSpacing: "-0.224px",
          }}
          className={`rounded-full transition-colors duration-300 ${
            tab.key === active ? "font-semibold text-apple-ink" : "text-black/60 hover:text-black"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
