"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

function subscribeToReducedMotion(callback: () => void) {
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// The server has no OS preference to read — default to "motion is fine"
// there, matching this component's normal (non-reduced) render, and let
// the client snapshot correct it after hydration if the OS says otherwise.
function getReducedMotionServerSnapshot() {
  return false;
}

// The one place to add/edit rotating login-screen lines — keep these real
// and accurate to shipped behavior only. No marketing claims, no
// unreleased features (e.g. nothing about ward-supervisor review until
// that's actually live and verified for every pilot site).
export const loginTips: string[] = [
  "Tip: Fill out your SOAP entry right after your shift, while the details are still fresh.",
  "Reminder: An entry only counts toward your rotation once your supervisor attests it.",
  "ClinRota works offline — entries and sign-offs sync automatically once you're back online.",
];

const ROTATE_MS = 6000;
const FADE_MS = 400;

export function LoginTips() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  useEffect(() => {
    if (reducedMotion || paused || loginTips.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % loginTips.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [reducedMotion, paused]);

  if (loginTips.length === 0) return null;

  // Nothing to rotate between — show the single line statically, no dots
  // or animation for content that isn't actually cycling.
  if (loginTips.length === 1) {
    return <p className="text-sm text-gray-600">{loginTips[0]}</p>;
  }

  const activeIndex = reducedMotion ? 0 : index;

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="max-w-sm"
    >
      <p
        key={reducedMotion ? "static" : activeIndex}
        className="min-h-[2.5rem] text-sm text-gray-600"
        style={!reducedMotion ? { animation: `${FADE_MS}ms ease-out loginTipFadeIn` } : undefined}
      >
        {loginTips[activeIndex]}
      </p>

      {!reducedMotion && (
        <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
          {loginTips.map((tip, i) => (
            <span
              key={tip}
              className="h-1.5 w-1.5 rounded-full transition-colors duration-300"
              style={{ backgroundColor: i === activeIndex ? "#E8734A" : "rgba(10,63,56,0.2)" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
