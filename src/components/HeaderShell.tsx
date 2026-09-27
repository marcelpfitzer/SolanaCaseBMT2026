"use client";

// The sticky top bar that changes while you scroll:
//  - at the very top: solid black, big logo, so it blends into the black hero below
//  - scrolled down: compact, translucent "glass" with blur and a hairline edge
// Everything follows the scroll position continuously (both directions), set as CSS
// variables directly on the element (no re-render per scroll, no stylesheet dependency).

import { useEffect, useRef } from "react";

const TOP = { bar: 88, logo: 42, opacity: 1, line: 0 }; // at the very top
const SCROLLED = { bar: 52, logo: 24, opacity: 0.8, line: 0.12 }; // after SHRINK_DISTANCE px
const SHRINK_DISTANCE = 160;

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
// Ease out, so the change feels natural rather than mechanical.
const ease = (t: number) => 1 - (1 - t) * (1 - t);

function styleFor(t: number) {
  const e = ease(t);
  return {
    "--bar-h": `${lerp(TOP.bar, SCROLLED.bar, e)}px`,
    "--logo-h": `${lerp(TOP.logo, SCROLLED.logo, e)}px`,
    "--bar-bg": `rgba(0, 0, 0, ${lerp(TOP.opacity, SCROLLED.opacity, e)})`,
    "--bar-line": `rgba(255, 255, 255, ${lerp(TOP.line, SCROLLED.line, e)})`,
  };
}

export default function HeaderShell({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const t = Math.min(Math.max(window.scrollY / SHRINK_DISTANCE, 0), 1);
      for (const [key, value] of Object.entries(styleFor(t))) nav.style.setProperty(key, value);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update); // at most once per frame
    };

    update(); // e.g. after a reload in the middle of the page
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav
      ref={ref}
      className="backdrop-blur-xl backdrop-saturate-[180%]"
      style={
        {
          position: "sticky",
          top: 0,
          zIndex: 20,
          ...styleFor(0),
          background: "var(--bar-bg)",
          boxShadow: "inset 0 -1px 0 var(--bar-line)",
        } as React.CSSProperties
      }
    >
      {children}
    </nav>
  );
}
