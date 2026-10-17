import { Wordmark } from "@/components/wordmark";
import { PortalMobileNav, PortalSidebarNav, type PortalNavItem } from "./portal-nav";

// "Dr. Kofi Mensah" → "K", not "D".
export function initialOf(name: string) {
  const firstName = name.trim().replace(/^(dr|mr|mrs|ms|miss|prof)\.?\s+/i, "");
  return firstName.charAt(0).toUpperCase() || "?";
}

// The frame around every coordinator, supervisor and super admin page: a
// permanent sidebar (the same pattern as the student portal) so every
// section is one click away from anywhere, collapsing to a scrolling link
// strip on narrow screens. Pages render their own DashboardHeader inside.
export function PortalShell({
  portalLabel,
  items,
  userName,
  subLabel,
  children,
}: {
  portalLabel: string;
  items: PortalNavItem[];
  userName: string;
  subLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-50 md:flex-row md:items-start">
      <nav
        aria-label={`${portalLabel} navigation`}
        className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col overflow-y-auto bg-[#17153B] px-[18px] py-7 md:flex"
      >
        <div className="flex flex-col gap-1.5 px-2.5 pb-6 pt-1">
          <Wordmark size={24} tone="onDark" />
          <span className="text-[11px] uppercase tracking-[0.03em] text-[#B9B5E0]">{portalLabel}</span>
        </div>
        <PortalSidebarNav items={items} />
        <div className="mt-auto flex items-center gap-2.5 border-t border-white/10 px-3 pt-3.5">
          <span
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
            style={{ background: "linear-gradient(135deg, #5A3BF0, #2563EB)" }}
            aria-hidden="true"
          >
            {initialOf(userName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-white">{userName}</span>
            {subLabel && <span className="block truncate text-[11px] text-[#B9B5E0]">{subLabel}</span>}
          </span>
        </div>
      </nav>

      <div className="bg-[#17153B] md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Wordmark size={22} tone="onDark" />
          <span className="text-[11px] uppercase tracking-[0.03em] text-[#B9B5E0]">{portalLabel}</span>
        </div>
        <PortalMobileNav items={items} />
      </div>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export type { PortalNavItem };
