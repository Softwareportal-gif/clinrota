// Shared frame for Praxxt Anatomy's public pages (sign-up, plans): the
// homepage's light brand look rather than the explorer's dark studio.
import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/wordmark";
import { manrope } from "@/fonts/manrope";
import { isAnatomySignupOpen } from "@/lib/anatomy/preview-access";

export const BRAND = {
  ink: "#17153B",
  body: "#4A4867",
  muted: "#6B6987",
  violet: "#5A3BF0",
  line: "#ECEBF5",
  gradient: "linear-gradient(90deg, #5A3BF0, #2563EB)",
  warm: "linear-gradient(90deg, #FF5C8A, #5A3BF0)",
};

export function MarketingFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${manrope.className} min-h-screen`}
      style={{
        color: BRAND.ink,
        background:
          "radial-gradient(ellipse at 12% 10%, rgba(90,59,240,.14), transparent 45%), radial-gradient(ellipse at 90% 0%, rgba(255,92,138,.10), transparent 45%), #FFFFFF",
      }}
    >
      <header className="border-b bg-white/90 backdrop-blur" style={{ borderColor: BRAND.line }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <Link href="/" aria-label="Praxxt home" className="shrink-0 transition hover:opacity-80">
            <Wordmark size={26} />
          </Link>
          <nav className="flex items-center gap-2 text-sm font-bold sm:gap-5">
            <Link href="/anatomy/plans" className="hidden transition-colors hover:text-[#5A3BF0] sm:inline">
              Plans
            </Link>
            <Link href="/anatomy/login" className="rounded-full px-3 py-2 transition-colors hover:text-[#5A3BF0]">
              Log in
            </Link>
            {isAnatomySignupOpen() && (
              <Link
                href="/anatomy/start"
                className="whitespace-nowrap rounded-full px-4 py-2 text-white transition hover:brightness-110"
                style={{ background: BRAND.warm }}
              >
                Start free trial
              </Link>
            )}
          </nav>
        </div>
      </header>
      {children}
      <footer className="px-6 py-8 text-center text-xs" style={{ color: BRAND.muted }}>
        © {new Date().getFullYear()} Praxxt, a product of Ikona Health and Research Consult. 3D model: Z-Anatomy (CC BY-SA
        4.0), based on BodyParts3D (CC BY-SA 2.1 Japan).
      </footer>
    </div>
  );
}
