import Link from "next/link";

// The one "go back" control used across the app, so every page that
// needs one shows it in the same place and style.
// `onDark` is for the dark header bands on the public help pages.
export function BackLink({
  href,
  label,
  tone = "onLight",
}: {
  href: string;
  label: string;
  tone?: "onLight" | "onDark";
}) {
  return (
    <Link
      href={href}
      className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        tone === "onDark"
          ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true">
        <path d="M12.5 15 7.5 10l5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </Link>
  );
}
