"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardIcon,
  ProfileIcon,
  PreferencesIcon,
  PlacementsIcon,
  DocumentsIcon,
  ClinicalLogIcon,
  MessagesIcon,
} from "./sidebar-icons";
import { ACCENT } from "./dashboard-sections/colors";

const NAV_ITEMS = [
  { href: "/student", label: "Dashboard", Icon: DashboardIcon, exact: true },
  { href: "/student/profile", label: "My Profile", Icon: ProfileIcon, exact: false },
  { href: "/student/preferences", label: "Rotation Preferences", Icon: PreferencesIcon, exact: false },
  { href: "/student/placements", label: "My Placements", Icon: PlacementsIcon, exact: false },
  { href: "/student/compliance", label: "Required Documents", Icon: DocumentsIcon, exact: false },
  { href: "/student/log/new", label: "Clinical Log", Icon: ClinicalLogIcon, exact: false },
  { href: "/student/messages", label: "Messages", Icon: MessagesIcon, exact: false },
];

export function StudentSidebarNav() {
  const pathname = usePathname();

  return (
    <>
      {NAV_ITEMS.map(({ href, label, Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              borderRadius: 8,
              background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
              borderLeft: isActive ? `3px solid ${ACCENT}` : "3px solid transparent",
              marginLeft: -3,
            }}
          >
            <Icon color={isActive ? "#FFFFFF" : "#C4C1E6"} />
            <span
              style={{
                color: isActive ? "#FFFFFF" : "#DDDBF2",
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </>
  );
}
