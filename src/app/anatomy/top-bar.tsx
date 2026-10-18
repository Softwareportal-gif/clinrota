"use client";

// Top of the explorer: where you are (system › region › structure) and the
// search box.
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import type { Structure } from "@/lib/anatomy/catalogue";
import { regionLabel, systemLabel } from "./system-labels";
import { TEXT, TEXT_MUTED } from "./theme";

export function Breadcrumb({ structure }: { structure: Structure | undefined }) {
  const crumbs = structure
    ? [`${systemLabel(structure.system)} system`, regionLabel(structure.region), structure.name]
    : ["Praxxt Anatomy"];
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-xs font-semibold uppercase tracking-wider">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={crumb} className={`flex min-w-0 items-center gap-1 ${last ? "" : "hidden sm:flex"}`}>
              {i > 0 && <ChevronRight size={14} aria-hidden className="hidden shrink-0 sm:block" style={{ color: TEXT_MUTED }} />}
              <span className="truncate" style={{ color: last ? TEXT : TEXT_MUTED }} aria-current={last ? "location" : undefined}>
                {crumb}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function TopBar({ structure, search }: { structure: Structure | undefined; search: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <div className="pointer-events-auto order-2 min-w-0 flex-1 sm:order-1">
        <Breadcrumb structure={structure} />
      </div>
      <div className="pointer-events-auto order-1 w-full sm:order-2 sm:w-[360px]">{search}</div>
    </div>
  );
}
