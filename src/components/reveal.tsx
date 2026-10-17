"use client";

import { useEffect, useRef } from "react";

// Fades and slides its content up as it scrolls into view — the liveliness
// phones get, since touch screens have no hover. Only content that starts
// below the screen is hidden first, so nothing visible on load flickers;
// with reduced motion preferred (or no IntersectionObserver) it does nothing.
// Styles: [data-reveal] in globals.css.
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number; // ms, to stagger a row of cards
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    el.dataset.reveal = "hidden";
    const show = () => {
      el.dataset.reveal = "shown";
      cleanup();
    };
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && show(), {
      rootMargin: "0px 0px -10% 0px",
    });
    // Backup for browsers that pause observers (e.g. a page opened in a
    // background tab): check the position on scroll too, so hidden content
    // can never stay hidden once it's on screen.
    const onScroll = () => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) show();
    };
    function cleanup() {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    }
    observer.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return cleanup;
  }, []);

  return (
    <div ref={ref} className={className} style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}>
      {children}
    </div>
  );
}
