"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PORTAL_ICONS, type PortalIconName } from "./portal-icons";

export type PortalNavItem = {
  href: string;
  label: string;
  icon: PortalIconName;
  // Only this exact path counts as active (a portal's home page, which
  // every other page's path also starts with).
  exact?: boolean;
  // A count shown next to the label, e.g. unread messages; hidden at 0.
  badge?: number;
};

function Badge({ count, active }: { count: number; active?: boolean }) {
  return (
    <span
      className={`ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
        active ? "bg-[#5A3BF0] text-white" : "bg-[#D63A74] text-white"
      }`}
    >
      {count > 99 ? "99+" : count}
      <span className="sr-only"> unread</span>
    </span>
  );
}

function isActive(pathname: string, item: PortalNavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function PortalSidebarNav({ items }: { items: PortalNavItem[] }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item);
        const Icon = PORTAL_ICONS[item.icon];
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`-ml-[3px] flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2.5 text-sm transition ${
                active
                  ? "border-[#5A3BF0] bg-white/10 font-semibold text-white"
                  : "border-transparent text-[#DDDBF2] hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
              {!!item.badge && <Badge count={item.badge} />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// Phones and narrow tablets: the same links as a horizontally scrolling
// strip under the top bar, since a 232px sidebar won't fit.
export function PortalMobileNav({ items }: { items: PortalNavItem[] }) {
  const pathname = usePathname();
  return (
    <ul className="flex gap-2 overflow-x-auto px-4 pb-3">
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm ${
                active ? "bg-white font-semibold text-[#17153B]" : "bg-white/10 text-[#DDDBF2]"
              }`}
            >
              {item.label}
              {!!item.badge && <Badge count={item.badge} active={active} />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
